import { redirectUrl, webhookUrl } from "../components/urls";
import { Container } from "typedi";
import config from "config";

import {
  Reservering,
  Payment,
  Ticket,
  StatusUpdate,
  getRepository,
} from "../models";
import { EntityManager } from "@mikro-orm/mysql";
import createMollieClient from "@mollie/api-client";

export async function paymentNeeded(reservering: Reservering): Promise<void> {
  await reservering.finishLoading();
  if (reservering.newPaymentNeeded) {
    const mollie_key: string = config.get("payment.mollie_key");

    const mollie = createMollieClient({ apiKey: mollie_key });
    const tickets = reservering.onbetaaldeTickets;

    // create a description for this set of tickets
    const description = Ticket.description(tickets);

    // request a new Mollie payment
    try {
      const payment = await mollie.payments.create({
        amount: {
          currency: "EUR",
          value: Ticket.totaalBedrag(tickets).toFixed(2),
        },
        description: description,
        redirectUrl: redirectUrl(reservering.id),
        webhookUrl: webhookUrl(reservering.id),
        metadata: {
          reservering_id: reservering.id,
        },
      });

      // add the status
      reservering.statusupdates.add(new StatusUpdate(payment.status));

      // insert a new Payment record
      let newPayment = new Payment(payment, description);
      reservering.payments.add(newPayment);

      for (const ticket of tickets) {
        ticket.payment = newPayment;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
