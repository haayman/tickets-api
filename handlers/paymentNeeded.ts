import EmbeddedQueue from "embedded-queue";
import { redirectUrl, webhookUrl } from "../components/urls";
import { Container } from "typedi";
import {
  Reservering,
  Payment,
  Ticket,
  StatusUpdate,
  getRepository,
} from "../models";
import { EntityManager } from "@mikro-orm/mysql";

export async function paymentNeeded(job: EmbeddedQueue.Job) {
  const em: EntityManager = Container.get("em");
  await em.transactional(async (em) => {
    const repository = em.getRepository(Reservering);
    const id = job.data as string;
    const reservering = await repository.findOne({ id }, [
      "tickets.prijs",
      "payments",
    ]);
    const mollie = Payment.mollieClient;
    if (reservering.newPaymentNeeded) {
      const tickets = reservering.onbetaaldeTickets;

      // create a description for this set of tickets
      const description = Ticket.description(tickets);

      // request a new Mollie payment
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
      em.persist(reservering);
      return newPayment;
    }
  });
}
