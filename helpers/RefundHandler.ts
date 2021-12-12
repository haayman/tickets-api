import { Payment, Reservering, Ticket, Log } from "../models";

import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";

export class RefundHandler {
  private tickets: Ticket[];
  private payments: { [key: string]: { payment: Payment; amount: number } };

  constructor(private em: EntityManager, private reservering: Reservering) {
    try {
      this.tickets = this.terugtebetalenTickets();
      this.payments = this.terugtebetalenPayments();
    } catch (ex) {
      winston.error("RefundHandler.constructor", ex);
      throw ex;
    }
  }

  terugtebetalenTickets(): Ticket[] {
    return this.reservering.tickets.getItems().filter((t) => t.terugbetalen);
  }

  /**
   * verzamel de bedragen per payment van alle terug te betalen tickets
   */
  terugtebetalenPayments() {
    let payments = {};
    for (const ticket of this.tickets) {
      if (ticket.payment) {
        const payment = ticket.payment;
        const id = payment.id;
        if (!payments[id]) {
          payments[id] = {
            payment,
            amount: 0,
          };
          payments[id].amount += ticket.prijs.prijs;
        }
      }
      return payments;
    }
  }

  async refund() {
    const payments = this.payments;

    for (const payment_id in payments) {
      const amount = payments[payment_id].amount;
      let payment = payments[payment_id].payment;
      await this.em.populate(payment, ["tickets"]);

      let refunded;
      try {
        refunded = await payment.refund(amount);
      } catch (ex) {
        // al gerefund. We hadden hier niet mogen komen
        winston.error(`Payment ${payment.payment_id} al teruggestort`);
        refunded = true;
      }
      if (refunded) {
        const terugbetalen = payment.tickets
          .getItems()
          .filter((t) => t.terugbetalen);
        for (const ticket of terugbetalen) {
          ticket.terugbetalen = false;
          ticket.geannuleerd = true;
        }
        const paymentDescription = Ticket.description(terugbetalen);
        await ReserveringMail.send(
          this.reservering,
          "teruggestort",
          `${paymentDescription} wordt teruggestort`,
          {
            bedrag: amount,
          }
        );
        await Log.addMessage(
          this.reservering,
          `${paymentDescription} teruggestort`
        );
      }
    }
  }

  static async verwerkRefunds() {
    const em: EntityManager = (Container.get("em") as EntityManager).fork();
    winston.info(`verwerkRefunds`);
    await em.transactional(async (em) => {
      const repository = em.getRepository(Reservering);
      const reserveringen = await repository.find(
        { tickets: { terugbetalen: true } },
        Reservering.populate()
      );
      for (const reservering of reserveringen) {
        await reservering.finishLoading();
        await new RefundHandler(em, reservering).refund();
      }
    });
  }
}
