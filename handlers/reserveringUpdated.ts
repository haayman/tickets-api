import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Reservering } from "../models";
import { RefundHandler } from "../helpers/RefundHandler";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";
import { queue } from "../startup/queue";

export type ReserveringUpdatedMessage = string;

export async function reserveringUpdated(
  reserveringId: ReserveringUpdatedMessage
) {
  winston.info(`reserveringUpdated, ${reserveringId}`);
  setTimeout(() => {
    RefundHandler.verwerkRefunds();
  }, 1000);

  setTimeout(async () => {
    const em: EntityManager = (Container.get("em") as EntityManager).fork();
    await em.transactional(async (em) => {
      const repository = em.getRepository<Reservering>("Reservering");
      const reservering = await repository.findOne(
        { id: reserveringId },
        Reservering.populate()
      );
      if (!reservering) {
        winston.error(`reservering ${reserveringId} niet gevondden`);
        return;
      }
      await reservering.finishLoading();
      const saldo = reservering.saldo;
      if (!saldo) {
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
      queue.emit("reserveringUpdatedDone", "");
    });
  }, 500);
}
