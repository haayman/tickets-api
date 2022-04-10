import { EntityManager } from "@mikro-orm/core";
import { Queue } from "bullmq";
import { Container } from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Log, Ticket, Reservering } from "../models";

export async function verwerkTekoop(verkochtBedrag: number) {
  if (!verkochtBedrag) return;
  winston.info(`verwerkTekoop(${verkochtBedrag})`);
  const em: EntityManager = (Container.get("em") as EntityManager).fork(false);
  await em.begin();
  try {
    const reserveringen: Map<Reservering, Ticket[]> = new Map();
    const repository = em.getRepository<Ticket>("Ticket");
    const tekoop = await repository.find(
      { tekoop: true },
      {
        orderBy: { created_at: "asc" },
        populate: ["prijs", "reservering.logs", "reservering.uitvoering"],
      }
    );

    for (const ticket of tekoop) {
      const reservering = ticket.reservering;
      if (ticket.prijs.prijs <= verkochtBedrag) {
        verkochtBedrag -= ticket.prijs.prijs;
        if (!reserveringen.has(reservering)) {
          reserveringen.set(reservering, []);
        }
        const tickets = reserveringen.get(reservering);

        await ticket.finishLoading();

        ticket.verkocht = true;
        ticket.tekoop = false;
        // saldo wordt positifief en moet dus uitbetaald worden
        ticket.saldo = ticket.prijs.prijs;

        reserveringen.set(reservering, [...tickets, ticket]);
      } else {
        winston.info(`${ticket} niet verkocht vanwege te laag bedrag`);
      }
    }
    for (let [reservering, tickets] of reserveringen) {
      await em.populate(reservering, Reservering.populate());
      const description = Ticket.description(tickets);
      Log.addMessage(reservering, `${description} verkocht`);
      ReserveringMail.send(reservering, "verkocht", `${description} verkocht`);
    }
    await em.commit();

    const queue: Queue = Container.get("verwerkRefundsQueue");
    await queue.add("verwerkRefunds", null);
  } catch (e) {
    winston.error(e);
    await em.rollback();
    throw e;
  }
}
