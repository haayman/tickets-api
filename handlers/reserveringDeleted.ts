import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Reservering } from "../models";
import { RefundHandler } from "../helpers/RefundHandler";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";

export async function reserveringDeleted(reserveringId: string) {
  winston.info(`reserveringDeleted ${reserveringId}`);
  RefundHandler.verwerkRefunds();

  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.begin();

  try {
    const repository = em.getRepository<Reservering>("Reservering");
    const reservering = await repository.findOne(
      { id: reserveringId },
      Reservering.populate()
    );

    if (!reservering.tickets.getItems().length) {
      repository.remove(reservering);
    } else {
      await ReserveringMail.send(
        reservering,
        "gewijzigd",
        `${reservering} te koop aangeboden`
      );
    }
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
    throw e;
  }
}
