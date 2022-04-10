import { connection } from "./startup/queue";

import express from "express";
import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();

const queues = [
  "verwerkTekoop",
  "reserveringUpdated",
  "paymentReceived",
  "reserveringCreated",
  "reserveringDeleted",
  "verwerkWachtlijst",
  "verwerkRefunds",
];

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: queues.map(
    (queue) => new BullMQAdapter(new Queue(queue, { connection }))
  ),
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/", serverAdapter.getRouter());

const port = 2222;
app
  .listen(port, "0.0.0.0", () => {
    console.log(`listening in port ${port}`);
  })
  .on("error", (e) => {
    console.error(e);
  });

// other configurations of your server
