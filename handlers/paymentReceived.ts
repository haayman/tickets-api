import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Reservering, Payment, Ticket, Log } from "../models";

export type PaymentReceiveMessage = {
  reservering_id: string;
  payment_id: string;
};

export async function paymentReceived(
  reservering_id: string,
  payment_id: string
) {
  winston.info(`paymentReceived(${reservering_id}, ${payment_id}})`);
  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.transactional(async (em) => {
    const repository = em.getRepository(Reservering);
    const reservering = await repository.findOneOrFail({ id: reservering_id }, [
      "tickets.prijs",
      "payments.tickets",
    ]);
    await reservering.finishLoading();
    const mollie = Payment.mollieClient();
    const mollie_payment = await mollie.payments.get(payment_id);
    if (!mollie_payment) {
      throw new Error(`unknown mollie_payment ${mollie_payment}`);
    }
    const payment: Payment = reservering.payments
      .getItems()
      .find((p) => p.payment_id == mollie_payment.id);

    if (!payment) {
      throw new Error(`Payment ${mollie_payment.id} niet gevonden`);
    }
    const tickets = payment.tickets.getItems();
    const description = Ticket.description(tickets);
    await Log.addMessage(
      reservering,
      `Status ${description}: ${payment.status}`
    );

    if (payment.status == "paid") {
      await ReserveringMail.send(
        reservering,
        "confirmationPayment",
        `Kaarten voor ${reservering}`
      );
    } else {
      await ReserveringMail.send(
        reservering,
        "paymentFailure",
        "Betaling mislukt"
      );
    }
  });
}
