import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Reservering } from "../models";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";

export type ReserveringCreatedMessage = string;

export async function reserveringCreated(
  reserveringId: ReserveringCreatedMessage
) {
  winston.info(`reserveringCreated, ${reserveringId}`);

  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");
    const reservering = await repository.findOne(
      { id: reserveringId },
      Reservering.populate()
    );
    if (!reservering) {
      throw new Error(`reservering ${reserveringId} niet gevonden`);
    }
    await reservering.finishLoading();
    if (reservering.saldo >= 0) {
      await ReserveringMail.send(
        reservering,
        "ticket",
        `kaarten voor ${reservering}`
      );
    } else if (reservering.wachtlijst) {
      await ReserveringMail.send(
        reservering,
        "wachtlijst",
        "Je staat op de wachtlijst"
      );
    }
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
    throw e;
  }
}
