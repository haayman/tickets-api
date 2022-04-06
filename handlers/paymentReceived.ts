import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Reservering, Payment, Ticket, Log, StatusUpdate } from "../models";
import { MOLLIECLIENT, MollieClient } from "../helpers/MollieClient";
import { Queue } from "bullmq";

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
  const mollieClient = Container.get(MOLLIECLIENT) as MollieClient;
  await em.begin();
  const queue: Queue = Container.get("verwerkTekoopQueue");

  try {
    const repository = em.getRepository(Reservering);
    const reservering = await repository.findOneOrFail(
      { id: reservering_id },
      Reservering.populate()
    );
    await reservering.finishLoading();
    const mollie = mollieClient.mollie;
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
    await em.populate(payment, ["tickets"]);

    // add the status
    reservering.setStatus(payment.status);

    const tickets = payment.tickets.getItems();
    if (payment.status === "paid") {
      for (const ticket of tickets) {
        ticket.saldo = 0;
      }
    }

    const description = Ticket.description(tickets);
    await Log.addMessage(
      reservering,
      `Status ${description}: ${payment.status}`
    );

    if (payment.status == "paid") {
      const amount = +mollie_payment.amount.value;
      await queue.add("verwerkTekoop", amount);
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
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
  }
}
