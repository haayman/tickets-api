import { EntityManager } from "@mikro-orm/core";
import Container from "typedi";
import { Reservering } from "../models";
import { RefundHandler } from "../helpers/RefundHandler";
import { ReserveringMail } from "../components/ReserveringMail";
import parseQuery from "~/routes/helpers/parseQuery";

export type ReserveringUpdatedMessage = string;

export async function reserveringUpdated(
  reserveringId: ReserveringUpdatedMessage
) {
  setTimeout(() => {
    RefundHandler.verwerkRefunds();
  }, 1000);

  setTimeout(async () => {
    const em: EntityManager = Container.get("em");
    const repository = em.getRepository<Reservering>("Reservering");
    const reservering = await repository.findOne(
      { id: reserveringId },
      Reservering.populate()
    );
    const saldo = reservering.saldo;
    const strReservering = reservering.toString();
    if (!saldo) {
      // vrijkaartjes
      ReserveringMail.send(reservering, "ticket", strReservering);
    } else if (reservering.wachtlijst) {
      ReserveringMail.send(
        reservering,
        "wachtlijst",
        "Je staat op de wachtlijst"
      );
    } else {
      ReserveringMail.send(reservering, "aangevraagd", "kaarten besteld");
    }
  }, 500);
}
