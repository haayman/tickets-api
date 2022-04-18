import { Payment, Reservering, Ticket, Log } from "../models";

import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";

export class RefundHandler {
  private tickets: Ticket[];
  private payments: { [key: string]: { payment: Payment; amount: number } };
  private teBetalenBedrag: number;

  constructor(private em: EntityManager, private reservering: Reservering) {
    try {
      this.tickets = this.terugtebetalenTickets();
      // bereken het saldo van alle openstaande bedragen (positief en negatief)
      this.teBetalenBedrag = Ticket.totaalSaldo(this.tickets);
      this.payments = this.terugtebetalenPayments();
    } catch (ex) {
      winston.error("RefundHandler.constructor", ex);
      throw ex;
    }
  }

  terugtebetalenTickets(): Ticket[] {
    return this.reservering.tickets.getItems().filter((t) => t.saldo > 0);
  }

  /**
   * verzamel alle payments waar nog een bedrag op staat dat terugbetaald kan worden
   */
  terugtebetalenPayments() {
    let payments = {};
    let teBetalenBedrag = this.teBetalenBedrag;
    for (const payment of this.reservering.payments) {
      if (teBetalenBedrag <= 0) break;
      if (payment.amountRemaining) {
        const id = payment.id;
        if (!payments[id]) {
          payments[id] = {
            payment,
            amount: 0,
          };
        }
        const amount = Math.min(teBetalenBedrag, payment.amountRemaining);
        payments[id].amount = amount;
        teBetalenBedrag -= amount;
      }
    }
    return payments;
  }

  async refund() {
    try {
      if (!this.tickets.length) return;
      const payments = this.payments;
      let refundedAmount = 0;

      for (const payment_id in payments) {
        const amount = payments[payment_id].amount;
        let payment = payments[payment_id].payment;

        let refunded = 0;
        try {
          refunded = +(await payment.refund(amount)).amount.value;
        } catch (ex) {
          // al gerefund. We hadden hier niet mogen komen
          winston.error(`Payment ${payment.payment_id} al teruggestort`);
        }
        refundedAmount += refunded;
      }

      const refunded = refundedAmount;

      for (const ticket of this.tickets) {
        const amount = Math.min(ticket.saldo, refundedAmount);
        ticket.saldo -= amount;
        if (ticket.saldo === 0) {
          ticket.geannuleerd = true;
        }
        refundedAmount -= amount;
      }

      await ReserveringMail.send(
        this.reservering,
        "teruggestort",
        `€${refunded.toFixed(2)} teruggestort`,
        { bedrag: refunded }
      );
    } catch (e) {
      winston.error(e);
      throw e;
    }
  }
}

export async function verwerkRefunds() {
  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.begin();
  try {
    const repository = em.getRepository(Reservering);
    const reserveringen = await repository.find(
      { tickets: { saldo: { $gt: 0 } } },
      // de tickets zijn al verkocht, daarom default filter uitschakelen
      { populate: Reservering.populate(), filters: false }
    );

    if (!reserveringen.length) return;

    winston.info(`verwerkRefunds ${reserveringen.length}`);
    for (const reservering of reserveringen) {
      await em.populate(reservering, Reservering.populate());
      await reservering.finishLoading();
      await new RefundHandler(em, reservering).refund();
    }
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
    throw e;
  }
}
