import appLoader from "../../../../app";
import request from "supertest";
import { Reservering, Voorstelling } from "../../../../models";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import {
  REFUNDABLE,
  NON_REFUNDABLE,
  VOLWASSENE,
  KIND,
  VRIJKAART,
  createVoorstelling,
} from "../createVoorstelling";
import { createReservering } from "../createReservering";
import {
  afterAllReserveringen,
  beforeAllReserveringen,
  beforeEachReserveringen,
} from "../initialize";
import Container from "typedi";
import clone from "lodash/clone";
import nodemailerMock from "nodemailer-mock";
import { MollieClient } from "../../mollie/MockMollieClient";
import { MOLLIECLIENT } from "../../../../helpers/MollieClient";

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
      await createReservering(request(app), {
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(1);
      expect(sentMail[0].subject).toMatch(/Kaarten voor 2x/);
    });

    it("not modify prijs", async () => {
      const newPrijs = clone(voorstelling.prijzen[VOLWASSENE]);
      newPrijs.prijs = 200;

      const res = await request(app)
        .post("/api/reservering")
        .send({
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
          tickets: [
            {
              prijs: newPrijs,
              aantal: 2,
            },
            {
              prijs: voorstelling.prijzen[KIND],
              aantal: 0,
            },
            {
              prijs: voorstelling.prijzen[VRIJKAART],
              aantal: 0,
            },
          ],
        });
      expect(res.body.openstaandBedrag).toBe(20);
    });

    it("should be wachtlijst", async () => {
      await createReservering(request(app), {
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
          {
            prijs: voorstelling.prijzen[KIND],
            aantal: 0,
          },
          {
            prijs: voorstelling.prijzen[VRIJKAART],
            aantal: 0,
          },
        ],
      });
      nodemailerMock.mock.reset();

      const { reservering } = await createReservering(request(app), {
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
          {
            prijs: voorstelling.prijzen[KIND],
            aantal: 0,
          },
          {
            prijs: voorstelling.prijzen[VRIJKAART],
            aantal: 0,
          },
        ],
      });
      expect(reservering.status).toBe(200);
      expect(reservering.body.id).toBeDefined();
      expect(reservering.body.openstaandBedrag).toBe(20);
      // expect(reservering.body.onbetaaldeTickets.length).toBe(3);
      expect(reservering.body.wachtlijst).toBe(true);

      const sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(1);
      expect(sentMail[0].subject).toMatch(/wachtlijst/);
    });

    /**
     * should throw an error because 3 tickets will never be available
     */
    it("should not allow too many tickets", async () => {
      const { reservering } = await createReservering(request(app), {
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 3,
          },
          {
            prijs: voorstelling.prijzen[KIND],
            aantal: 0,
          },
          {
            prijs: voorstelling.prijzen[VRIJKAART],
            aantal: 0,
          },
        ],
      });
      expect(reservering.status).toBe(500);
    });
  });
});
