import appLoader from "../../../../app";
import request from "supertest";
import { Reservering, Voorstelling } from "../../../../models";
import { EntityManager, EntityRepository } from "@mikro-orm/core";
import {
  createVoorstelling,
  VOLWASSENE,
  KIND,
  VRIJKAART,
  REFUNDABLE,
} from "../createVoorstelling";
import { createReservering, updateReservering } from "../createReservering";
import { beforeAllReserveringen, beforeEachReserveringen } from "../initialize";
import Container from "typedi";
import nodemailerMock from "nodemailer-mock";
import { MollieClient } from "../../mollie/MockMollieClient";
import { MOLLIECLIENT } from "../../../../helpers/MollieClient";
import faker from "community-faker";
import { drainAllQueues, queuesAreEmpty } from "../queuesAreEmpty";

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
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
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
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });
    expect(res.reservering.body.wachtlijst).toBe(true);

    await queuesAreEmpty();
    nodemailerMock.mock.reset(); // not interested in these mails

    // geef 1 kaartje vrij
    res = await updateReservering(request(app), {
      id: reserveringId1,
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });

    const sentMail = nodemailerMock.mock.sentMail();
    const gewijzigdeMail = sentMail.find((m) =>
      m.subject.match(/kaarten voor/)
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

  it("wachtlijst niet bijwerken bij omzetting naar vrijkaarten", async () => {
    /*
        1) r1: reserveer 2 kaarten => vol
        2) r2: bestel 1 kaart => wachtlijst
        3) r1: vervang 2 kaarten door 2 vrijkaarten. r2 mag níet uit de wachtlijst
      */
    let res = await createReservering(request(app), {
      naam: faker.name.findName(),
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 2,
        },
      ],
    });

    const reserveringId1 = res.reservering.body.id;

    res = await createReservering(request(app), {
      naam: "In wachtlijst",
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });
    expect(res.reservering.body.wachtlijst).toBe(true);

    nodemailerMock.mock.reset(); // not interested in these mails

    // omzetten naar vrijkaarten
    res = await updateReservering(request(app), {
      id: reserveringId1,
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 0,
        },
        {
          prijs: voorstelling.prijzen[VRIJKAART],
          aantal: 2,
        },
      ],
    });

    const sentMail = nodemailerMock.mock.sentMail();
    const gewijzigdeMail = sentMail.find((m) =>
      m.subject.match(/kaarten voor/)
    );
    expect(gewijzigdeMail).toBeTruthy();
    expect(gewijzigdeMail.html).toMatch(/2x vrijkaart/);

    expect(sentMail.find((m) => m.subject.match(/uit wachtlijst/))).toBeFalsy();
  });

  it("verwerk wachtlijst non refundable", async () => {
    // test wachtlijst
    // 1) r1: reserveer 2 kaarten eerste voorstelling
    // 2) r2: reserveer 1 kaart eerste voorstelling
    //    - mail 'wachtlijst' verzonden'
    //    - geen betaling
    // 3) r1: annuleer 1 kaart
    //    - r1: mail 2x 'waarvan 1 te koop'
    //    - r2: je bent van wachtlijst mail
    //    - r2: saldo negatief
    //    - r2: betaal
    //    - r1: mail geld teruggestort
    let res = await createReservering(request(app), {
      naam: faker.name.findName(),
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
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
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });
    expect(res.reservering.body.wachtlijst).toBe(true);

    nodemailerMock.mock.reset(); // not interested in these mails

    // geef 1 kaartje vrij
    res = await updateReservering(request(app), {
      id: reserveringId1,
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });
    const sentMail = nodemailerMock.mock.sentMail();
    const gewijzigdeMail = sentMail.find((m) =>
      m.subject.match(/kaarten voor/)
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

  it("put extra tickets on wachtlijst", async () => {
    /*
      -------------------------------
        p1 1x 1e voorstelling => uitverkocht
        p2 1x 1e voorstelling: uitverkocht
        p1 2x kaarten => wachtlijst en geen extra betaling
        p2 annuleert
        p1 krijgt mail: uit wachtlijst en moet nog 1x bijbetalen
      */

    // stap 1: koop en betaal kaarten
    let res: any = await createReservering(request(app), {
      naam: faker.name.findName(),
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });
    const reservering = res.reservering.body;

    // zorg dat het uitverkocht wordt
    await createReservering(request(app), {
      naam: faker.name.findName(),
      email: faker.internet.email(),
      uitvoering: voorstelling.uitvoeringen[REFUNDABLE].id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 1,
        },
      ],
    });

    // verhoog het aantal: wachtlijst
    res = await updateReservering(request(app), {
      id: reservering.id,
      tickets: [
        {
          prijs: voorstelling.prijzen[VOLWASSENE],
          aantal: 2,
        },
      ],
    });
    expect(res.body.wachtlijst).toBe(true);
  });
});
