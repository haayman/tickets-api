import appLoader from "../../../../app";
import request from "supertest";
import { Reservering, Voorstelling } from "../../../../models";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import createVoorstelling from "../createVoorstelling";
import { createReservering, updateReservering } from "../createReservering";
import { beforeAllReserveringen, beforeEachReserveringen } from "../initialize";
import Container from "typedi";
import clone from "lodash/clone";
import nodemailerMock from "nodemailer-mock";
import { reserveringUpdatedDone, uitvoeringUpdatedDone } from "../promises";
import { MollieClient } from "../../mollie/MockMollieClient";
import { MOLLIECLIENT } from "../../../../helpers/MollieClient";
import faker from "community-faker";

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

describe("/reservering", () => {
  describe("/post", () => {
    it("verwerk wachtlijst refundable", async () => {
      // test wachtlijst
      // 1) r1: reserveer 2 kaarten laatste voorstelling
      // 2) r2: reserveer 1 kaart laatste voorstelling
      //    - mail 'wachtlijst' verzonden'
      //    - geen betaling
      // 3) r1: annuleer 1 kaart
      //    - r1: geld terug mail
      //    - r2: je bent van wachtlijst mail
      //    - r2: saldo negatief
      //    - r2: betaal
      let res = await createReservering(request(app), {
        naam: faker.name.findName(),
        email: faker.internet.email(),
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      res = await createReservering(request(app), {
        naam: "In wachtlijst",
        email: faker.internet.email(),
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1,
          },
        ],
      });
      expect(res.reservering.body.wachtlijst).toBe(true);

      nodemailerMock.mock.reset(); // not interested in these mails

      // geef 1 kaartje vrij
      res = await updateReservering(request(app), {
        id: reserveringId1,
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1,
          },
        ],
      });
      await Promise.all([reserveringUpdatedDone(), uitvoeringUpdatedDone()]);
      const sentMail = nodemailerMock.mock.sentMail();
      const gewijzigdeMail = sentMail.find((m) =>
        m.subject.match(/Gewijzigde bestelling/)
      );
      expect(gewijzigdeMail).toBeTruthy();
      expect(gewijzigdeMail.html).toMatch(/1x volwassenen/);

      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/uit wachtlijst/))
      ).toBeTruthy();
    });

    it("verwerk wachtlijst non refundable", async () => {
      // test wachtlijst
      // 1) r1: reserveer 2 kaarten eerste voorstelling
      // 2) r2: reserveer 1 kaart eerste voorstelling
      //    - mail 'wachtlijst' verzonden'
      //    - geen betaling
      // 3) r1: annuleer 1 kaart
      //    - r1: geld terug mail
      //    - r2: je bent van wachtlijst mail
      //    - r2: saldo negatief
      //    - r2: betaal
      let res = await createReservering(request(app), {
        naam: faker.name.findName(),
        email: faker.internet.email(),
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      res = await createReservering(request(app), {
        naam: "In wachtlijst",
        email: faker.internet.email(),
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1,
          },
        ],
      });
      expect(res.reservering.body.wachtlijst).toBe(true);

      nodemailerMock.mock.reset(); // not interested in these mails

      // geef 1 kaartje vrij
      res = await updateReservering(request(app), {
        id: reserveringId1,
        uitvoering: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1,
          },
        ],
      });
      await Promise.all([reserveringUpdatedDone(), uitvoeringUpdatedDone()]);
      const sentMail = nodemailerMock.mock.sentMail();
      const gewijzigdeMail = sentMail.find((m) =>
        m.subject.match(/Gewijzigde bestelling/)
      );
      expect(gewijzigdeMail).toBeTruthy();
      expect(gewijzigdeMail.html).toMatch(/1x volwassenen/);

      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/uit wachtlijst/))
      ).toBeTruthy();
    });
  });
});

/* cases:
-------------------------------
p1: 1x 1e voorstelling
p2: 1x: 1e voorstelling
p3: 2x: 1e voorstelling => wachtlijst
p1: annuleert
p2: annuleert => p3 van wachtlijst
*/
