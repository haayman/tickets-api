import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Reservering } from "../models";
import { RefundHandler } from "../helpers/RefundHandler";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";
import { getQueue } from "../startup/queue";

export type ReserveringCreatedMessage = string;

export async function reserveringCreated(
  reserveringId: ReserveringCreatedMessage
) {
  winston.info(`reserveringCreated, ${reserveringId}`);
  RefundHandler.verwerkRefunds();

  const em: EntityManager = (Container.get("em") as EntityManager).fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");
    const reservering = await repository.findOne(
      { id: reserveringId },
      Reservering.populate()
    );
    if (!reservering) {
      winston.error(`reservering ${reserveringId} niet gevonden`);
      return;
    }
    await reservering.finishLoading();
    const saldo = reservering.saldo;
    if (saldo >= 0) {
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
    } else {
      await ReserveringMail.send(
        reservering,
        "aangevraagd",
        `${reservering} besteld`
      );
    }
    await em.commit();
  } catch (e) {
    winston.error(e);
    await em.rollback();
  } finally {
    const queue = getQueue();
    queue.emit("reserveringCreatedDone", "");
  }
}
