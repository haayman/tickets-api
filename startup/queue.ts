import NRP from "node-redis-pubsub";
import { Container } from "typedi";
import { reserveringUpdated } from "../handlers/reserveringUpdated";
import { reserveringDeleted } from "../handlers/reserveringDeleted";
import { paymentNeeded } from "../handlers/paymentNeeded";
import { paymentReceived } from "../handlers/paymentReceived";
import { uitvoeringUpdated } from "../handlers/uitvoeringUpdated";
import { verwerkTekoop } from "../handlers/verwerkTekoop";

let queue: NRP.NodeRedisPubSub;

export default async function () {
  queue = NRP({
    port: 6379, // Redis port
    host: "linux", // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    db: 0,
  });

  // queue.on("paymentNeeded", paymentNeeded);
  // @ts-ignore
  queue.on("paymentReceived", paymentReceived);

  queue.on("reserveringUpdated", reserveringUpdated);

  queue.on("reserveringDeleted", reserveringDeleted);

  // @ts-ignore
  queue.on("uitvoeringUpdated", uitvoeringUpdated);

  // @ts-ignore
  queue.on("verwerkTekoop", verwerkTekoop);

  Container.set("queue", queue);
}

export { queue };
