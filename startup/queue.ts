import { Queue } from "embedded-queue";
import { paymentNeeded } from "../handlers/paymentNeeded";

const filename = "./queue.db";

export let queue: Queue;

export default async function () {
  queue = await Queue.createQueue({
    filename,
    autoload: true,
  });

  queue.process("paymentNeeded", paymentNeeded, 1);
}
