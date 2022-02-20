import appLoader from "../../../../app";
import request from "supertest";
import { Reservering, Voorstelling } from "../../../../models";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import createVoorstelling from "../createVoorstelling";
import { createReservering } from "../createReservering";
import {
  afterAllReserveringen,
  beforeAllReserveringen,
  beforeEachReserveringen,
} from "../initialize";
import Container from "typedi";
import clone from "lodash/clone";
import { mock } from "nodemailer-mock";
import { MollieClient } from "../../mollie/MockMollieClient";
import { MOLLIECLIENT } from "../../../../helpers/MollieClient";
import { queuesAreEmpty } from "../queuesAreEmpty";

jest.setTimeout(3000000);

let em: EntityManager;
let reserveringRepository: EntityRepository<Reservering>;
let app;

let voorstelling: Voorstelling;

beforeAll(async () => {
  app = await appLoader();
  Container.set(MOLLIECLIENT, new MollieClient());
  em = (Container.get("em") as EntityManager).fork();
  await beforeAllReserveringen(em);
  reserveringRepository = em.getRepository<Reservering>("Reservering");
  voorstelling = await createVoorstelling(em);
});

beforeEach(async () => {
  await beforeEachReserveringen(em);
});

afterAll(async () => {
  await afterAllReserveringen();
});

describe("/reservering", () => {
  describe("/post", () => {
    it("succesvolle reservering", async () => {
      const waitFor = queuesAreEmpty();
      await createReservering(request(app), {
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2,
          },
        ],
      });

      await waitFor;
      const sentMail = mock.sentMail();
      expect(sentMail.length).toBe(1);
      expect(sentMail[0].subject).toMatch(/Kaarten voor 2x/);
    });

    it("not modify prijs", async () => {
      const newPrijs = clone(voorstelling.prijzen[0]);
      newPrijs.prijs = 200;
      const waitFor = queuesAreEmpty();

      const res = await request(app)
        .post("/api/reservering")
        .send({
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoering: voorstelling.uitvoeringen[0].id,
          tickets: [
            {
              prijs: newPrijs,
              aantal: 2,
            },
            {
              prijs: voorstelling.prijzen[1],
              aantal: 0,
            },
            {
              prijs: voorstelling.prijzen[2],
              aantal: 0,
            },
          ],
        });
      // await waitFor;
      expect(res.body.openstaandBedrag).toBe(20);
    });

    it("should be wachtlijst", async () => {
      const waitFor = queuesAreEmpty();

      const res = await request(app)
        .post("/api/reservering")
        .send({
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoering: voorstelling.uitvoeringen[0].id,
          tickets: [
            {
              prijs: voorstelling.prijzen[0],
              aantal: 3,
            },
            {
              prijs: voorstelling.prijzen[1],
              aantal: 0,
            },
            {
              prijs: voorstelling.prijzen[2],
              aantal: 0,
            },
          ],
        });
      await waitFor;
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.openstaandBedrag).toBe(30);
      // expect(res.body.onbetaaldeTickets.length).toBe(3);
      expect(res.body.wachtlijst).toBe(true);

      const sentMail = mock.sentMail();
      expect(sentMail.length).toBe(1);
      expect(sentMail[0].subject).toMatch(/wachtlijst/);
    });
  });
});
