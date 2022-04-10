import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Log, Reservering } from "../models";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";
import { RefundHandler } from "./RefundHandler";

export type ReserveringUpdatedMessage = string;

export async function reserveringUpdated(
  reserveringId: ReserveringUpdatedMessage
) {
  winston.info(`reserveringUpdated, ${reserveringId}`);
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

    await new RefundHandler(em, reservering).refund();

    if (reservering.aantal && reservering.saldo >= 0) {
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
    } else if (!reservering.aantal) {
      Log.addMessage(reservering, `reservering ${reservering.naam} verwijderd`);
      repository.remove(reservering);
    }
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
    throw e;
  }
}
