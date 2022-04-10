import nock from "nock";
import "../mollie/mollie-nock";

import { EntityManager } from "@mikro-orm/core";
import { synchronousQueues } from "./synchonousQueues";

jest.mock("nodemailer");

export async function beforeAllReserveringen(em: EntityManager) {
  // jest.setMock("nodemailer", nodemailerMock);
  const connection = em.getConnection();
  await connection.execute("delete from voorstellingen");

  synchronousQueues();
}

export async function beforeEachReserveringen(em: EntityManager) {
  const connection = em.getConnection();
  await connection.execute("delete from reserveringen");
  const { mock } = require("nodemailer-mock");
  mock.reset();
  nock.abortPendingRequests();
}

export async function afterAllReserveringen() {
  // const queue = getQueue();
  // await queue.close();
}
