import { EntityManager } from "@mikro-orm/core";
import { Container } from "typedi";
import { Log, Ticket } from "../models";

export async function verwerkTekoop(aantal: number) {
  const em: EntityManager = Container.get("em");
  await em.transactional(async (em) => {
    const repository = em.getRepository<Ticket>("Ticket");
    const tekoop = await repository.find(
      { tekoop: true },
      {
        orderBy: { created_at: "asc" },
        limit: aantal,
        populate: ["reservering.logs"],
      }
    );

    for (const ticket of tekoop) {
      const reservering = ticket.reservering;

      await ticket.finishLoading();

      ticket.verkocht = true;
      ticket.tekoop = false;
      ticket.terugbetalen = true;

      Log.addMessage(reservering, `${ticket} verkocht`);
    }
  });
}
