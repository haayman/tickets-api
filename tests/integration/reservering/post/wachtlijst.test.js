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
        naam: "Test",
        email: "arjen.haayman+test@gmail.com",
        uitvoeringId: voorstelling.uitvoeringen[0].id,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 2
        }]
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      res = await createReservering(request(app), {
        naam: "In wachtlijst",
        email: "arjen.haayman+test@gmail.com",
        uitvoeringId: voorstelling.uitvoeringen[0].id,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 1
        }]
      })
      expect(res.reservering.body.wachtlijst).toBe(true);

      nodemailerMock.mock.reset(); // not interested in these mails

      // geef 1 kaartje vrij
      res = await updateReservering(request(app), {
        id: reserveringId1,
        uitvoeringId: voorstelling.uitvoeringen[0].id,
        tickets: [{
          prijs: voorstelling.prijzen[0],
          aantal: 1
        }]
      })

      const sentMail = nodemailerMock.mock.sentMail();
      const gewijzigdeMail = sentMail.find(m => m.subject.match(/Gewijzigde bestelling/));
      expect(gewijzigdeMail).toBeTruthy();
      expect(gewijzigdeMail.html).toMatch(/waarvan 1 wacht op terugbetaling/);

      expect(sentMail.find(m => m.subject.match(/€10.00 teruggestort/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/uit wachtlijst/))).toBeTruthy();

    });

    it.only("verwerk verkoop non refundable", async () => {
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
      // expect(sentMail.length).toBe(3);
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

    });


    // 1) maak voorstelling met 2 plaatsen binnen 14 dagen
    // 2) r1: reserveer 2 kaarten
    // 3) r2: reserveer 1 kaart
    // 4) r1: annuleert
    //    - mail: 'gewijzigd'. 'waarvan 2 te koop'
    //    - mail: 'uit_wachtlijst'

  })
})
