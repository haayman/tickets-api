import { getQueue } from "../../../startup/queue";

export function paymentReceivedDone() {
  return new Promise((resolve) => {
    const queue = getQueue();
    const unsubscribe = queue.on("paymentReceivedDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function reserveringUpdatedDone() {
  return new Promise((resolve) => {
    const queue = getQueue();
    const unsubscribe = queue.on("reserveringUpdatedDone", async () => {
      await verwerkRefundsDone();
      unsubscribe();
      resolve(true);
    });
    // setTimeout(() => {
    //   unsubscribe();
    //   resolve(true);
    // }, 10 * 1000);
  });
}

export function reserveringDeletedDone() {
  return new Promise((resolve) => {
    const queue = getQueue();
    const unsubscribe = queue.on("reserveringDeletedDone", async () => {
      await verwerkRefundsDone();
      unsubscribe();
      resolve(true);
    });
  });
}

export function uitvoeringUpdatedDone() {
  const queue = getQueue();
  return new Promise((resolve) => {
    const unsubscribe = queue.on("uitvoeringUpdatedDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function verwerkTekoopDone() {
  const queue = getQueue();
  return new Promise((resolve) => {
    const unsubscribe = queue.on("verwerkTekoopDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function verwerkRefundsDone() {
  const queue = getQueue();
  return new Promise((resolve) => {
    const unsubscribe = queue.on("verwerkRefundsDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}
