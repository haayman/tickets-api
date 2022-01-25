import events from "events";
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

class EventEmitter extends events {
  emit(channel, ...args) {
    winston.info(`onQueue: ${channel}`, ...args);
    return super.emit(channel, ...args);
  }
}

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

  Container.set("queue", queue);
}

export function getQueue() {
  return queue;
}
