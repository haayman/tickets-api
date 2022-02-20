import { Job, Queue, QueueEvents, Worker } from "bullmq";
import { reserveringUpdated } from "../handlers/reserveringUpdated";
import { reserveringCreated } from "../handlers/reserveringCreated";
import { reserveringDeleted } from "../handlers/reserveringDeleted";
import { paymentReceived } from "../handlers/paymentReceived";
import { uitvoeringUpdated } from "../handlers/uitvoeringUpdated";
import { verwerkTekoop } from "../handlers/verwerkTekoop";
import winston from "winston";
import Container from "typedi";

export const connection = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  port: 6379,
  host: "linux",
  family: 4,
  db: 0,
};

function createQueue(connection, queueName: string, handler): Queue {
  const queue = new Queue(queueName, {
    connection,
    // @ts-ignore
    settings: { maxStalledCount: 0, lockDuration: 3000 },
  });
  const worker = new Worker(
    queueName,
    (job: Job) => {
      return handler(job.data);
    },
    { connection }
  );
  worker.on("error", (e) => {
    winston.error(e);
  });

  const queueEvents = new QueueEvents(queueName, { connection });
  const jobs = new Map([]);
  queueEvents.on("added", async (job) => {
    winston.info("added", job);
    jobs.set(job.jobId, job);
  });
  queueEvents.on("completed", async (job) => {
    winston.info("completed", { job: jobs.get(job.jobId) });

    jobs.delete(job.jobId);
  });
  queueEvents.on("failed", async (job) => {
    winston.info("failed", { job: jobs.get(job.jobId) });
    jobs.delete(job.jobId);
  });

  return queue;
}

export default async function () {
  const queues: Queue[] = [];

  const verwerkTekoopQueue = createQueue(
    connection,
    "verwerkTekoop",
    verwerkTekoop
  );
  Container.set("verwerkTekoopQueue", verwerkTekoopQueue);
  queues.push(verwerkTekoopQueue);

  const reserveringUpdatedQueue = createQueue(
    connection,
    "reserveringUpdated",
    reserveringUpdated
  );
  Container.set("reserveringUpdatedQueue", reserveringUpdatedQueue);
  queues.push(reserveringUpdatedQueue);

  const paymentReceivedQueue = createQueue(
    connection,
    "paymentReceived",
    paymentReceived
  );
  Container.set("paymentReceivedQueue", paymentReceivedQueue);
  queues.push(paymentReceivedQueue);

  const reserveringCreatedQueue = createQueue(
    connection,
    "reserveringCreated",
    reserveringCreated
  );
  Container.set("reserveringCreatedQueue", reserveringCreatedQueue);
  queues.push(reserveringCreatedQueue);

  const reserveringDeletedQueue = createQueue(
    connection,
    "reserveringDeleted",
    reserveringDeleted
  );
  Container.set("reserveringDeletedQueue", reserveringDeletedQueue);
  queues.push(reserveringDeletedQueue);

  const uitvoeringUpdatedQueue = createQueue(
    connection,
    "uitvoeringUpdated",
    uitvoeringUpdated
  );
  Container.set("uitvoeringUpdatedQueue", uitvoeringUpdatedQueue);
  queues.push(uitvoeringUpdatedQueue);

  Container.set("queues", queues);
}
