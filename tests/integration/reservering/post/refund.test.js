jest.setTimeout(3000000);
const root = "../";
const ROOT = process.env.ROOT;
const request = require("supertest");
// https://www.npmjs.com/package/nodemailer-mock
const nodemailerMock = require("nodemailer-mock");

require(`${root}/setup.js`);

const { createReservering } = require(`${root}/createReservering`);

let app = require(`${ROOT}/app`);
const {
  REFUNDABLE,
  VOLWASSENE,
  KIND,
  VRIJKAART,
  createVoorstelling,
} = require(`${root}/createVoorstelling`);

let voorstelling;

beforeAll(async () => {
  voorstelling = await createVoorstelling();
});

describe("/reservering", () => {
  describe("/post", () => {
    // ===============================================================================================

    it("should completely refund if set to 0", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "noshow",
        email: "noshow@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 0
      res = await request(app)
        .put("/api/reservering/" + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[VOLWASSENE],
              aantal: 0,
            },
          ],
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(0);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(0);
      expect(
        sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€20.00 teruggestort/))
      ).toBeTruthy();
    });

    it("should refund 1 ticket ", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "noshow",
        email: "noshow@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 1
      res = await request(app)
        .put("/api/reservering/" + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[VOLWASSENE],
              aantal: 1,
            },
          ],
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(1);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(10);
      expect(
        sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
    });

    it.skip("should not refund vrijkaartje ", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "friend",
        email: "friend@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VRIJKAART],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 1
      res = await request(app)
        .put("/api/reservering/" + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[VRIJKAART],
              aantal: 1,
            },
          ],
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(1);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(0);
      expect(
        sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).not.toBeTruthy();
    });

    // ===============================================================================================

    it("should completely refund if deleted", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "noshow",
        email: "noshow@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      res = await request(app).del("/api/reservering/" + reserveringId1);

      let sentMail = nodemailerMock.mock.sentMail();
      // expect(
      //   sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
      // ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€20.00 teruggestort/))
      ).toBeTruthy();
    });

    it.skip("should only refund sold amount", async () => {
      /*
        Verkoop alleen tickets als het bedrag daadwerkelijk verkocht is
        1. a: reserveer 2 volwassenen
        2. a: verkoop 1 volwassene
        3. b: koop 1 kind => geen kaarten verkocht (niet helemaal eerlijk, want dit wordt niet onthouden)
      */
    });

    // ===============================================================================================

    it.skip("should partly refund", async () => {
      /*
      1) reserveer 2 volwassen kaarten
      2) wijzig 1 kaart van volwassen naar kind
        - € 2.50 refund

        N.B. WERKT NOG NIET
      */
      const uitvoeringId = voorstelling.uitvoeringen[REFUNDABLE].id;

      let res = await createReservering(request(app), {
        naam: "ouder",
        email: "ouder@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // wijzig prijs van 1 van de kaarten
      // gebruik niet updateReservering, want in principe komt er geen betaling aan te pas
      res = await request(app)
        .put("/api/reservering/" + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[VOLWASSENE],
              aantal: 1,
            },
            {
              prijs: voorstelling.prijzen[KIND],
              aantal: 1,
            },
          ],
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(2);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(
        voorstelling.prijzen[VOLWASSENE].prijs +
          voorstelling.prijzen[KIND].prijs
      );
      expect(
        sentMail.find((m) => m.subject.match(/Gewijzigde reservering/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€2.50 teruggestort/))
      ).toBeTruthy();
    });

    it.skip("should buy own ticket back", async () => {
      /*
      1) reserveer 2 kaarten 
      2) zet 1 te koop
      3) zet reservering weer op 2 => tekoop = false, nieuwe mail met tickets

      13-3-2022: check
      */
      let res = await request(app)
        .post("/api/reservering")
        .send({
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoering: voorstelling.uitvoeringen[NON_REFUNDABLE].id,
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
      await queuesAreEmpty();

      const reserveringId = res.reservering.body.id;
      // zet 1 kaart te koop
      res = await updateReservering(request(app), {
        id: reserveringId,
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
        ],
      });

      await queuesAreEmpty();
      nodemailerMock.mock.reset();

      // zet reservering weer op 2 => tekoop = false, nieuwe mail met tickets
      res = await updateReservering(request(app), {
        id: reserveringId,
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 2,
          },
        ],
      });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail[0].html).toMatch(/2x volwassene/);
    });

    it.skip("should buy both tickets back", async () => {
      /*
      1) reserveer 1x volwassene en 1x kind
      2) zet allebei te koop
      3) koop beide weer terug
      
      13-3-2022: check
      */
      let res = await request(app)
        .post("/api/reservering")
        .send({
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoering: voorstelling.uitvoeringen[NON_REFUNDABLE].id,
          tickets: [
            {
              prijs: voorstelling.prijzen[VOLWASSENE],
              aantal: 1,
            },
            {
              prijs: voorstelling.prijzen[KIND],
              aantal: 1,
            },
            {
              prijs: voorstelling.prijzen[VRIJKAART],
              aantal: 0,
            },
          ],
        });
      await queuesAreEmpty();

      const reserveringId = res.reservering.body.id;
      // zet beide kaarten te koop
      res = await updateReservering(request(app), {
        id: reserveringId,
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 0,
          },
          {
            prijs: voorstelling.prijzen[KIND],
            aantal: 0,
          },
        ],
      });

      await queuesAreEmpty();
      nodemailerMock.mock.reset();

      // zet reservering weer op 2 => tekoop = false, nieuwe mail met tickets
      res = await updateReservering(request(app), {
        id: reserveringId,
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[VOLWASSENE],
            aantal: 1,
          },
          {
            prijs: voorstelling.prijzen[KIND],
            aantal: 1,
          },
        ],
      });
      const { tickets } = res.body;

      expect(tickets[VOLWASSENE].aantalTekoop).toBe(0);
      expect(tickets[KIND].aantalTekoop).toBe(0);

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail[0].html).toMatch(/1x volwassene/);
      expect(sentMail[0].html).toMatch(/1x kind/);
      expect(sentMail[0].html).not.toMatch(/te koop/);
    });
  });
});
