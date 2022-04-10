import winston, { loggers } from "winston";
import Container from "typedi";
import { verwerkTekoop } from "../../../handlers/verwerkTekoop";
import { reserveringUpdated } from "../../../handlers/reserveringUpdated";
import { paymentReceived } from "../../../handlers/paymentReceived";
import { reserveringCreated } from "../../../handlers/reserveringCreated";
import { reserveringDeleted } from "../../../handlers/reserveringDeleted";
import { verwerkWachtlijst } from "../../../handlers/verwerkWachtlijst";
import { verwerkRefunds } from "../../../handlers/RefundHandler";

import { Queue } from "bullmq";

function createQueue(queueName: string, handler): Queue {
  const eventHandler = {
    async add(_queueName, value: any) {
      winston.info(queueName, value);
      await handler(value);
    },
  };

  // @ts-ignore
  return eventHandler;
}

export function synchronousQueues() {
  const verwerkTekoopQueue = createQueue("verwerkTekoop", verwerkTekoop);
  Container.set("verwerkTekoopQueue", verwerkTekoopQueue);

  const reserveringUpdatedQueue = createQueue(
    "reserveringUpdated",
    reserveringUpdated
  );
  Container.set("reserveringUpdatedQueue", reserveringUpdatedQueue);

  const paymentReceivedQueue = createQueue("paymentReceived", paymentReceived);
  Container.set("paymentReceivedQueue", paymentReceivedQueue);

  const reserveringCreatedQueue = createQueue(
    "reserveringCreated",
    reserveringCreated
  );
  Container.set("reserveringCreatedQueue", reserveringCreatedQueue);

  const reserveringDeletedQueue = createQueue(
    "reserveringDeleted",
    reserveringDeleted
  );
  Container.set("reserveringDeletedQueue", reserveringDeletedQueue);

  const verwerkWachtlijstQueue = createQueue(
    "verwerkWachtlijst",
    verwerkWachtlijst
  );
  Container.set("verwerkWachtlijstQueue", verwerkWachtlijstQueue);

  const verwerkRefundsQueue = createQueue("verwerkRefunds", verwerkRefunds);
  Container.set("verwerkRefundsQueue", verwerkRefundsQueue);
}
