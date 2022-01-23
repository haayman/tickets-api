import EventEmitter from "events";
import { Container } from "typedi";
import { reserveringUpdated } from "../handlers/reserveringUpdated";
import { reserveringCreated } from "../handlers/reserveringCreated";
import { reserveringDeleted } from "../handlers/reserveringDeleted";
import { paymentNeeded } from "../handlers/paymentNeeded";
import { paymentReceived } from "../handlers/paymentReceived";
import { uitvoeringUpdated } from "../handlers/uitvoeringUpdated";
import { verwerkTekoop } from "../handlers/verwerkTekoop";
import winston from "winston";

let queue;

export default async function () {
  queue = new EventEmitter();

  // queue.on("paymentNeeded", paymentNeeded);
  // @ts-ignore
  queue.on("paymentReceived", paymentReceived);

  queue.on("reserveringUpdated", reserveringUpdated);

  queue.on("reserveringCreated", reserveringCreated);

  queue.on("reserveringDeleted", reserveringDeleted);

  // @ts-ignore
  queue.on("uitvoeringUpdated", uitvoeringUpdated);

  // @ts-ignore
  queue.on("verwerkTekoop", verwerkTekoop);

  queue.on("*", (data, channel) => {
    winston.info(`onQueue ${channel}`, data);
  });

  queue.on("error", (data, channel) => {
    winston.error(`onQueue ${channel}`, data);
  });

  Container.set("queue", queue);
}

export function getQueue() {
  return queue;
}
