import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Uitvoering, Reservering } from "../models";

export async function uitvoeringUpdated(uitvoeringId: number) {
  winston.info(`uitvoeringUpdated ${uitvoeringId}`);
  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.transactional(async (em) => {
    const repository = em.getRepository<Uitvoering>("Uitvoering");
    const uitvoering = await repository.findOne(uitvoeringId);
    let vrije_plaatsen = uitvoering.vrije_plaatsen;

    const wachtenden = (
      await uitvoering.reserveringen.matching({
        limit: vrije_plaatsen,
        orderBy: { created_at: "asc" },
        populate: Reservering.populate(),
      })
    ).filter((reservering) => reservering.wachtlijst);

    for (const wachtende of wachtenden) {
      if (wachtende.aantal <= vrije_plaatsen) {
        vrije_plaatsen -= wachtende.aantal;
        wachtende.wachtlijst = false;
        await ReserveringMail.send(
          wachtende,
          "uit_wachtlijst",
          "uit wachtlijst"
        );
      }
    }
  });
}
