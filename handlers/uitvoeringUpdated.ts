import { EntityManager, QueryOrder } from "@mikro-orm/core";
import Container from "typedi";
import winston from "winston";
import { ReserveringMail } from "../components/ReserveringMail";
import { Uitvoering, Reservering } from "../models";
import { getQueue } from "../startup/queue";

export async function uitvoeringUpdated(uitvoeringId: number) {
  setTimeout(async () => {
    winston.info(`uitvoeringUpdated ${uitvoeringId}`);
    let verkochtBedrag = 0;
    const em: EntityManager = (Container.get("em") as EntityManager).fork();
    await em.begin();
    try {
      const repository = em.getRepository<Uitvoering>("Uitvoering");
      const uitvoering = await repository.findOne(uitvoeringId);
      let vrije_plaatsen = uitvoering.vrije_plaatsen;
      const reserveringRepository =
        em.getRepository<Reservering>("Reservering");

      const wachtenden = await reserveringRepository.find(
        { uitvoering: uitvoering, wachtlijst: true },
        Reservering.populate(),
        { created_at: QueryOrder.ASC }
      );
      for (const wachtende of wachtenden) {
        if (wachtende.aantal <= vrije_plaatsen) {
          vrije_plaatsen -= wachtende.aantal;
          verkochtBedrag += wachtende.bedrag;
          wachtende.wachtlijst = false;
          await em.populate(wachtende, Reservering.populate());
          await ReserveringMail.send(
            wachtende,
            "uit_wachtlijst",
            "uit wachtlijst"
          );
        }
      }
      await em.commit();
    } catch (e) {
      winston.error(e);
      await em.rollback();
    } finally {
      const queue = getQueue();
      queue.emit("verwerkTekoop", verkochtBedrag);
      queue.emit("uitvoeringUpdatedDone", "");
    }
  }, 500);
}
