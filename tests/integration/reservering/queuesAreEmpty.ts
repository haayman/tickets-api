import { Queue, QueueEvents } from "bullmq";
import Container from "typedi";
import queue from "~/startup/queue";

function checkJobs(queue: Queue): Promise<boolean> {
  return new Promise((resolve) => {
    queue
      .getJobs(["active", "wait", "paused", "repeat", "delayed"])
      .then((existingJobs) => {
        if (existingJobs.length) {
          setTimeout(async () => {
            await checkJobs(queue);
            resolve(true);
          }, 50);
        } else {
          resolve(true);
        }
      });
  });
}

export async function drainAllQueues() {
  const queues: Queue[] = Container.get("queues");
  await Promise.all(queues.map(async (queue) => await queue.obliterate()));
}

/**
 * wacht net zo lang tot alle queues leeg zijn
 * @returns
 */
export async function queuesAreEmpty() {
  const queues: Queue[] = Container.get("queues");
  await Promise.all(queues.map(checkJobs));
}
