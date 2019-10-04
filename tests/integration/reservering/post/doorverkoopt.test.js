jest.setTimeout(3000000);
const root = '../'
process.env.NODE_CONFIG_DIR = __dirname + `${root}../../../../config/`;
process.env.NODE_ENV = 'test';
const request = require("supertest");
// https://www.npmjs.com/package/nodemailer-mock
const nodemailerMock = require('nodemailer-mock');

require(`${root}/setup.js`);

const {
  createReservering,
  updateReservering
} = require(`${root}/createReservering`);

let app = require(`${root}../../../app`);
const {
  Reservering,
  Voorstelling,
} = require(`${root}../../../models/`);
const createVoorstelling = require(`${root}/createVoorstelling`);

let voorstelling;

beforeAll(async () => {
	voorstelling = await createVoorstelling();
});

describe("/reservering", async () => {
  describe("/post", () => {
    it("verwerk verkoop non refundable", async () => {
      /* 
      test wachtlijst
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
        const uitvoeringId = voorstelling.uitvoeringen[1].id

        let res = await createReservering(request(app), {
          naam: "verkoper",
          email: "verkoper@mail.example",
          uitvoeringId: uitvoeringId,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }]
        });

        const reserveringId1 = res.reservering.body.id;
        expect(res.reservering.body.wachtlijst).toBe(false);

        nodemailerMock.mock.reset();

        // geef 2 kaartjes vrij
        res = await updateReservering(request(app), {
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 0
          }]
        })

        let sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail[0].subject).toMatch(/Gewijzigde bestelling/);
        expect(sentMail[0].html).toMatch(/waarvan 2 te koop/);

        nodemailerMock.mock.reset();

        // nu koopt iemand een kaartje op dezelfde avond
        res = await createReservering(request(app), {
          naam: "koper1",
          email: "test2@mail.example",
          uitvoeringId: uitvoeringId,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }]
        })

        sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail.length).toBe(3);
        expect(sentMail.find(m => m.subject.match(/€10.00 teruggestort/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/kaarten besteld/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/1x/))).toBeTruthy();

        nodemailerMock.mock.reset();

        // nu koopt iemand een kaartje op een andere avond
        res = await createReservering(request(app), {
          naam: "koper2",
          email: "test3@mail.example",
          uitvoeringId: voorstelling.uitvoeringen[0].id,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }]
        })

        sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail.length).toBe(3);
        expect(sentMail.find(m => m.subject.match(/€10.00 teruggestort/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/kaarten besteld/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/1x/))).toBeTruthy();

      }
    );

  // ===============================================================================================

  it("should completely refund if set to 0", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id

      let res = await createReservering(request(app), {
        naam: "noshow",
        email: "noshow@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 2
        }]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 0
      res = await request(app)
        .put("/api/reservering/" + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 0
          }]
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(0);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(0);
      expect(sentMail.find(m => m.subject.match(/Gewijzigde bestelling/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€20.00 teruggestort/))).toBeTruthy();

    }
  );

  // ===============================================================================================

  it("should completely refund if deleted", async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id

      let res = await createReservering(request(app), {
        naam: "noshow",
        email: "noshow@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 2
        }]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      res = await request(app).del("/api/reservering/" + reserveringId1)

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.find(m => m.subject.match(/Gewijzigde bestelling/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€20.00 teruggestort/))).toBeTruthy();
    }
	);


  // ===============================================================================================

  it("should partly refund", async () => {
    /* 
    1) reserveer 2 volwassen kaarten
    2) wijzig 1 kaart van volwassen naar kind
      - € 2.50 refund
    */
      const uitvoeringId = voorstelling.uitvoeringen[0].id

      let res = await createReservering(request(app), {
        naam: "ouder",
        email: "ouder@mail.example",
        uitvoeringId: uitvoeringId,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 2
        }]
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
          tickets: [{
              prijs: voorstelling.prijzen[0],
              aantal: 1
            },
            {
              prijs: voorstelling.prijzen[1],
              aantal: 1
            }
          ]
        });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(2);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(voorstelling.prijzen[0].prijs + voorstelling.prijzen[1].prijs);
      expect(sentMail.find(m => m.subject.match(/Gewijzigde reservering/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€2.50 teruggestort/))).toBeTruthy();
    }
	);

  // 1) maak voorstelling met 2 plaatsen binnen 14 dagen
  // 2) r1: reserveer 2 kaarten
  // 3) r2: reserveer 1 kaart
  // 4) r1: annuleert
  //    - mail: 'gewijzigd'. 'waarvan 2 te koop'
  //    - mail: 'uit_wachtlijst'

})
})
