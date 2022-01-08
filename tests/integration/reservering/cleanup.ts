import "axios-debug-log";
import nock from "nock";
import nodemailerMock from "nodemailer-mock";
import "./mollie-mock";
import Container from "typedi";
import { EntityManager } from "@mikro-orm/core";

jest.setMock("nodemailer", nodemailerMock);

export async function beforeAllReserveringen(em: EntityManager) {
  const connection = em.getConnection();
  await connection.execute("delete from voorstellingen");
  await em.flush();
}

export async function beforeEachReserveringen(em: EntityManager) {
  const connection = em.getConnection();
  await connection.execute("delete from reserveringen");
  await em.flush();
  nodemailerMock.mock.reset();
  nock.cleanAll();
}
