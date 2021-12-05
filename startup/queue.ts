import NRP from "node-redis-pubsub";
import { paymentNeeded } from "../handlers/paymentNeeded";
import config from "config";
import { Container } from "typedi";

let queue: NRP.NodeRedisPubSub;

export default async function () {
  queue = NRP({
    port: 6379, // Redis port
    host: "linux", // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    db: 0,
  });

  queue.on("paymentNeeded", paymentNeeded);

  Container.set("queue", queue);
}

export { queue };
