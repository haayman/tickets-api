import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { ReserveringMail } from "../components/ReserveringMail";
import { Reservering, Payment, Ticket, Log } from "../models";

export type PaymentReceiveMessage = {
  reservering_id: string;
  payment_id: string;
};

export async function paymentReceived({
  reservering_id,
  payment_id,
}: PaymentReceiveMessage) {
  const em: EntityManager = Container.get("em");
  await em.transactional(async (em) => {
    const repository = em.getRepository(Reservering);
    const reservering = await repository.findOne({ id: reservering_id }, [
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

    const tickets = payment.tickets.getItems();
    const description = Ticket.description(tickets);
    await Log.addMessage(
      reservering,
      `Status ${description}: ${payment.betaalstatus}`
    );

    if (payment.betaalstatus == "paid") {
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
