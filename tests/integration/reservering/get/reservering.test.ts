import "axios-debug-log";
import request from "supertest";
import faker from "community-faker";
import { Reservering, Voorstelling } from "../../../../models";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import createVoorstelling from "../createVoorstelling";
import getAuthToken from "../../../getAuthToken";
import appLoader from "../../../../app";

import { beforeAllReserveringen, beforeEachReserveringen } from "../initialize";
import Container from "typedi";
jest.setTimeout(3000000);

process.env.DEBUG = "axios";

let authToken;
let em: EntityManager;
let reserveringRepository: EntityRepository<Reservering>;
let app;

let voorstelling: Voorstelling;

beforeAll(async () => {
  app = await appLoader();
  em = (Container.get("em") as EntityManager).fork();
  await beforeAllReserveringen(em);
  reserveringRepository = em.getRepository<Reservering>("Reservering");
  voorstelling = await createVoorstelling(em);
  authToken = getAuthToken();
  // console.log('beforeAll', voorstelling);
});

beforeEach(async () => {
  await beforeEachReserveringen(em);
});

describe("/reservering", () => {
  describe("/get", () => {
    beforeEach(async () => {
      const reserveringen = [
        {
          naam: "naam1",
          email: faker.internet.email(),
          uitvoering: voorstelling.uitvoeringen[0].id,
          tickets: [
            {
              prijs: voorstelling.prijzen[0].id,
            },
          ],
        },
        {
          naam: "naam2",
          email: faker.internet.email(),
          uitvoering: voorstelling.uitvoeringen[0].id,
          tickets: [
            {
              prijs: voorstelling.prijzen[1].id,
            },
          ],
        },
      ];
      for (const data of reserveringen) {
        const reservering = reserveringRepository.create(data);
        em.persist(reservering);
      }
      await em.flush();
    });

    it("should return alle reserveringen", async () => {
      const res = await request(app)
        .get("/api/reservering")
        .set("Authorization", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((u) => u.naam === "naam1")).toBeTruthy();
      expect(res.body.some((u) => u.naam === "naam2")).toBeTruthy();
    });

    it("should return not authorized", async () => {
      const res = await request(app).get("/api/reservering");
      expect(res.status).toBe(401);
    });
  });

  describe("/get/id", () => {
    it("should return specific reservering", async () => {
      const reservering = reserveringRepository.create({
        naam: faker.name.findName(),
        email: faker.internet.email(),
        uitvoering: voorstelling.uitvoeringen[0].id,
      });
      em.persistAndFlush(reservering);

      const id = reservering.id;
      const res = await request(app)
        .get("/api/reservering/" + id)
        .set("Authorization", authToken);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it("should return 404 not found", async () => {
      const res = await request(app)
        .get("/api/reservering/1")
        .set("Authorization", authToken);
      expect(res.status).toBe(404);
    });
  });
});
