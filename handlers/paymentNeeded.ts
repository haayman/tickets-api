import { redirectUrl, webhookUrl } from "../components/urls";

import { Reservering, Payment, Ticket } from "../models";
import winston from "winston";
import { MOLLIECLIENT, MollieClient } from "../helpers/MollieClient";
import Container from "typedi";

export async function paymentNeeded(reservering: Reservering): Promise<void> {
  await reservering.finishLoading();
  try {
    const mollieClient = Container.get(MOLLIECLIENT) as MollieClient;
    if (reservering.newPaymentNeeded) {
      const mollie = mollieClient.mollie;
      const tickets = reservering.onbetaaldeTickets;

      // create a description for this set of tickets
      const description = Ticket.description(tickets);

      // request a new Mollie payment
      const totaalBedrag = -Ticket.totaalSaldo(tickets);
      const payment = await mollie.payments.create({
        amount: {
          currency: "EUR",
          value: totaalBedrag.toFixed(2),
        },
        description: description,
        redirectUrl: redirectUrl(reservering.id),
        webhookUrl: webhookUrl(reservering.id),
        metadata: {
          reservering_id: reservering.id,
        },
      });
      winston.info(`new payment ${payment.id} for ${reservering.id}`);

      // add the status
      reservering.setStatus(payment.status);

      // insert a new Payment record
      let newPayment = new Payment(payment, description);
      reservering.payments.add(newPayment);

      for (const ticket of tickets) {
        ticket.payment = newPayment;
      }
    }
  } catch (e) {
    winston.error(e);
    throw e;
  }
}
