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
      // await verwerkRefundsDone();
      unsubscribe();
      resolve(true);
    });
  });
}

export function reserveringCreatedDone() {
  return new Promise((resolve) => {
    const queue = getQueue();
    const unsubscribe = queue.on("reserveringCreatedDone", async () => {
      unsubscribe();
      resolve(true);
    });
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

export function verwerkWachtlijstDone() {
  const queue = getQueue();
  return new Promise((resolve) => {
    const unsubscribe = queue.on("verwerkWachtlijstDone", () => {
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
