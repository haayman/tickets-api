import { queue } from "../../../startup/queue";

export function paymentReceivedDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("paymentReceivedDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function reserveringUpdatedDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("reserveringUpdatedDone", async () => {
      await verwerkRefundsDone();
      unsubscribe();
      resolve(true);
    });
  });
}

export function reserveringDeletedDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("reserveringDeletedDone", async () => {
      await verwerkRefundsDone();
      unsubscribe();
      resolve(true);
    });
  });
}

export function uitvoeringUpdatedDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("uitvoeringUpdatedDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function verwerkTekoopDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("verwerkTekoopDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}

export function verwerkRefundsDone() {
  return new Promise((resolve) => {
    const unsubscribe = queue.on("verwerkRefundsDone", () => {
      unsubscribe();
      resolve(true);
    });
  });
}
