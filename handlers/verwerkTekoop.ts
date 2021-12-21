import { EntityManager } from "@mikro-orm/core";
import { Container } from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Log, Ticket, Reservering } from "../models";

export async function verwerkTekoop(aantal: number) {
  if (!aantal) return;
  winston.info(`verwerkTekoop(${aantal})`);
  const em: EntityManager = Container.get("em");
  const repository = em.getRepository<Ticket>("Ticket");
  const tekoop = await repository.find(
    { tekoop: true },
    {
      orderBy: { created_at: "asc" },
      limit: aantal,
      populate: ["prijs", "reservering.logs", "reservering.uitvoering"],
    }
  );

  const reserveringen: Map<Reservering, Ticket[]> = new Map();
  for (const ticket of tekoop) {
    const reservering = ticket.reservering;
    if (!reserveringen.has(reservering)) {
      reserveringen.set(reservering, []);
    }
    const tickets = reserveringen.get(reservering);

    await ticket.finishLoading();

    ticket.verkocht = true;
    ticket.tekoop = false;
    ticket.terugbetalen = true;

    reserveringen.set(reservering, [...tickets, ticket]);
  }

  for (let [reservering, tickets] of reserveringen) {
    await em.populate(reservering, Reservering.populate());
    const description = Ticket.description(tickets);
    Log.addMessage(reservering, `${description} verkocht`);
    ReserveringMail.send(reservering, "verkocht", `${description} verkocht`);
  }
}
