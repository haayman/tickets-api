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
import { createReservering, updateReservering } from "../createReservering";
import {
  afterAllReserveringen,
  beforeAllReserveringen,
  beforeEachReserveringen,
} from "../initialize";
import Container from "typedi";
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
    it("verwerk verkoop non refundable", async () => {
      /*
      WERKT WEL met de hand, niet met dit script

      1) r1: reserveer 2 kaarten laatste voorstelling
      2) r1: annuleer 2 kaarten
          - worden allebei te koop aangeboden
      3) r2: reserveer 1 kaart laatste voorstelling
         - € 10 teruggestort voor r1
         - r2 krijgt ticket
      4) r3: reserveer 1 kaart laatste voorstelling (andere uitvoering)
        -€10 teruggestort voor r1
        - r2 krijgt ticket
      */
      // over 10 dagen
      const uitvoeringId = voorstelling.uitvoeringen[NON_REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "verkoper",
        email: "verkoper@mail.example",
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      nodemailerMock.mock.reset();

      // geef 2 kaartjes vrij
      res = await updateReservering(request(app), {
        id: reserveringId1,
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 0,
          },
        ],
      });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail[0].subject).toMatch(/kaarten voor 2x/i);
      expect(sentMail[0].html).toMatch(/waarvan 2 te koop/);

      nodemailerMock.mock.reset();

      // nu koopt iemand een kaartje op dezelfde avond
      res = await createReservering(request(app), {
        naam: "koper1",
        email: "test2@mail.example",
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });

      sentMail = nodemailerMock.mock.sentMail();
      // expect(sentMail.length).toBe(3);
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(sentMail.find((m) => m.subject.match(/1x/))).toBeTruthy();

      nodemailerMock.mock.reset();

      // nu koopt iemand een kaartje op een andere avond
      res = await createReservering(request(app), {
        naam: "koper2",
        email: "test3@mail.example",
        uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });

      sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(3);
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(sentMail.find((m) => m.subject.match(/1x/))).toBeTruthy();
    });

    it("meteen doorverkopen naar de wachtlijst", async () => {
      /*
      1) r1: reserveer 2 kaarten laatste voorstelling
      2) r2, r3: reserveert 1 kaart voor laatste voorstelling: wachtlijst
      3) r1: annuleer 2 kaarten
          - worden allebei te koop aangeboden
          - r2 en r3 krijgen uitnodiging om te betalen
      */
      // over 10 dagen
      const uitvoeringId = voorstelling.uitvoeringen[NON_REFUNDABLE].id;

      let res: any = await createReservering(request(app), {
        naam: "verkoper",
        email: "verkoper@mail.example",
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      res = await createReservering(request(app), {
        naam: "In wachtlijst",
        email: "koper1@gmail.com",
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });
      expect(res.reservering.body.wachtlijst).toBe(true);
      const reserveringId2 = res.reservering.body.id;

      res = await createReservering(request(app), {
        naam: "In wachtlijst",
        email: "koper2@gmail.com",
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });
      const reserveringId3 = res.reservering.body.id;

      expect(res.reservering.body.wachtlijst).toBe(true);

      nodemailerMock.mock.reset();

      res = await request(app).del("/api/reservering/" + reserveringId1);

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(3);
      expect(sentMail.filter((m) => m.subject.match(/wachtlijst/)).length).toBe(
        2
      );

      res = await request(app).get("/api/reservering/" + reserveringId2);
      expect(res.body.openstaandBedrag).toBe(10);

      // betaal door zelfde bestellingen nog een keer te doen
      await updateReservering(request(app), {
        id: reserveringId2,
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });
      await updateReservering(request(app), {
        id: reserveringId3,
        uitvoering: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });

      res = await request(app).get("/api/uitvoering/" + uitvoeringId);
      expect(res.body.wachtlijst).toBe(0);
      expect(res.body.te_koop).toBe(0);
      expect(res.body.aantal_plaatsen).toBe(2);
    });
  });

  it("should only refund sold amount", async () => {
    /*
        Verkoop alleen tickets als het bedrag daadwerkelijk verkocht is
        1. a: reserveer 2 volwassenen
        2. a: verkoop 1 volwassene
        3. b: koop 1 kind => geen kaarten verkocht (niet helemaal eerlijk, want dit wordt niet onthouden)
      */
    const uitvoeringId = voorstelling.uitvoeringen[NON_REFUNDABLE].id;

    let res: any = await createReservering(request(app), {
      naam: "noshow",
      email: "noshow@mail.example",
      uitvoering: uitvoeringId,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 2,
        },
      ],
    });

    const reserveringId1 = res.reservering.body.id;

    nodemailerMock.mock.reset();

    // verkoop 1 volwassene
    res = await updateReservering(request(app), {
      id: reserveringId1,
      uitvoering: uitvoeringId,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });

    let sentMail = nodemailerMock.mock.sentMail();

    await createReservering(request(app), {
      naam: "kind",
      email: "kind@mail.example",
      uitvoering: uitvoeringId,
      tickets: [
        {
          prijs: voorstelling.prijzen[KIND],
          aantal: 1,
        },
      ],
    });
    // expect(
    //   sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
    // ).toBeTruthy();
    expect(
      sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
    ).toBeFalsy();

    res = await request(app).get("/api/uitvoering/" + uitvoeringId);
    expect(res.body.wachtlijst).toBe(0);

    // kaart is niet verkocht
    expect(res.body.te_koop).toBe(1);
  });
});
