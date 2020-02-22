jest.setTimeout(3000000);
const root = '../';
const ROOT = process.env.ROOT;
const request = require('supertest');
// https://www.npmjs.com/package/nodemailer-mock
const nodemailerMock = require('nodemailer-mock');

require(`${root}/setup.js`);

const {
  createReservering,
  updateReservering
} = require(`${root}/createReservering`);

let app = require(`${ROOT}/app`);
const createVoorstelling = require(`${root}/createVoorstelling`);

let voorstelling;

beforeAll(async () => {
  voorstelling = await createVoorstelling();
});

describe('/reservering', () => {
  describe('/post', () => {
    it('verwerk verkoop non refundable', async () => {
      /*
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
      const uitvoeringId = voorstelling.uitvoeringen[1].id;

      let res = await createReservering(request(app), {
        naam: 'verkoper',
        email: 'verkoper@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      nodemailerMock.mock.reset();

      // geef 2 kaartjes vrij
      res = await updateReservering(request(app), {
        id: reserveringId1,
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 0
          }
        ]
      });

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail[0].subject).toMatch(/Gewijzigde bestelling/);
      expect(sentMail[0].html).toMatch(/waarvan 2 te koop/);

      nodemailerMock.mock.reset();

      // nu koopt iemand een kaartje op dezelfde avond
      res = await createReservering(request(app), {
        naam: 'koper1',
        email: 'test2@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }
        ]
      });

      sentMail = nodemailerMock.mock.sentMail();
      // expect(sentMail.length).toBe(3);
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/kaarten besteld/))
      ).toBeTruthy();
      expect(sentMail.find((m) => m.subject.match(/1x/))).toBeTruthy();

      nodemailerMock.mock.reset();

      // nu koopt iemand een kaartje op een andere avond
      res = await createReservering(request(app), {
        naam: 'koper2',
        email: 'test3@mail.example',
        uitvoeringId: voorstelling.uitvoeringen[0].id,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }
        ]
      });

      sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(3);
      expect(
        sentMail.find((m) => m.subject.match(/€10.00 teruggestort/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/kaarten besteld/))
      ).toBeTruthy();
      expect(sentMail.find((m) => m.subject.match(/1x/))).toBeTruthy();
    });

    it('meteen doorverkopen naar de wachtlijst', async () => {
      /*
      1) r1: reserveer 2 kaarten laatste voorstelling
      2) r2, r3: reserveert 1 kaart voor laatste voorstelling: wachtlijst
      2) r1: annuleer 2 kaarten
          - worden allebei te koop aangeboden
          - r1 krijgt € 20 teruggestort
          - r2 en r3 krijgen uitnodiging om te betalen
      */
      // over 10 dagen
      const uitvoeringId = voorstelling.uitvoeringen[1].id;

      let res = await createReservering(request(app), {
        naam: 'verkoper',
        email: 'verkoper@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;
      expect(res.reservering.body.wachtlijst).toBe(false);

      res = await createReservering(request(app), {
        naam: 'In wachtlijst',
        email: 'koper1@gmail.com',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }
        ]
      });
      expect(res.reservering.body.wachtlijst).toBe(true);
      const reserveringId2 = res.reservering.body.id;

      res = await createReservering(request(app), {
        naam: 'In wachtlijst',
        email: 'koper2@gmail.com',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }
        ]
      });
      const reserveringId3 = res.reservering.body.id;

      expect(res.reservering.body.wachtlijst).toBe(true);

      nodemailerMock.mock.reset();

      res = await request(app).del('/api/reservering/' + reserveringId1);

      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.length).toBe(3);
      expect(
        sentMail.find((m) => m.subject.match(/€20.00 teruggestort/))
      ).toBeTruthy();
      expect(sentMail.filter((m) => m.subject.match(/wachtlijst/)).length).toBe(
        2
      );

      res = await request(app).get('/api/reservering/' + reserveringId2);
      expect(res.body.openstaandBedrag).toBe(10);

      res = await request(app).get('/api/uitvoering/' + uitvoeringId);
      expect(res.body.wachtlijst).toBe(0);
      expect(res.body.tekoop).toBe(0);
      expect(res.body.aantal_plaatsen).toBe(2);
    });
  });

  it.only('al betaalde kaarten in de wachtlijst worden automatisch doorverkocht', async () => {
    /*
    zie https://github.com/haayman/plusleo_tickets/issues/5
    1) r1: 2 kaarten laatste voorstelling (wachtlijst)
    2) r2: 1 kaart 1e voorstelling en betaalt.
    3) r2: wisselt naar dag 2 en komt in de wachtlijst
    4) r1: zet 1 kaart in de verkoop

    resultaat:
      - r1 krijgt geld terug (wordt automatisch doorverkocht)
      - r2 krijgt 'uit de wachtlijst' en 'reservering gewijzigd'
    */
    // over 10 dagen
    const uitvoering1 = voorstelling.uitvoeringen[1].id;
    const uitvoering2 = voorstelling.uitvoeringen[0].id;

    let res = await createReservering(request(app), {
      naam: 'verkoper',
      email: 'verkoper@mail.example',
      uitvoeringId: uitvoering1,
      tickets: [
        {
          prijs: voorstelling.prijzen[0],
          aantal: 2
        }
      ]
    });

    const reserveringId1 = res.reservering.body.id;

    res = await createReservering(request(app), {
      naam: 'Katrien',
      email: 'katrien@gmail.com',
      uitvoeringId: uitvoering2,
      tickets: [
        {
          prijs: voorstelling.prijzen[0],
          aantal: 1
        }
      ]
    });
    const reserveringId2 = res.reservering.body.id;

    nodemailerMock.mock.reset();

    res = await request(app)
      .put('/api/reservering/' + reserveringId2)
      .send({
        uitvoeringId: uitvoering1,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 1
          }
        ]
      });
    expect(res.body.wachtlijst).toBeTruthy();
    expect(res.body.openstaandBedrag).toBe(0);
    let sentMail = nodemailerMock.mock.sentMail();
    let mail = sentMail.find((m) => m.subject.match(/Gewijzigd/));
    expect(mail).toBeTruthy();

    // ze staat nu in de wachtlijst
    expect(mail.html.match(/wachtlijst/)).toBeTruthy();
    // maar heeft al wel een QR-code
    expect(mail.html.match(/QR-code/)).toBeTruthy();

    nodemailerMock.mock.reset();

    // gebruiker 1 geeft kaartje vrij.
    // zou eigenlijk in de verkoop moeten, maar er is al betaald
    res = await request(app).put('/api/reservering/' + reserveringId1, {
      uitvoeringId: uitvoering1,
      tickets: [
        {
          prijs: voorstelling.prijzen[0],
          aantal: 1
        }
      ]
    });

    sentMail = nodemailerMock.mock.sentMail();
    // expect(sentMail.length).toBe(4);
    // expect(sentMail.find(m => m.subject.match(/€10.00 teruggestort/))).toBeTruthy();
    // expect(sentMail.filter(m => m.subject.match(/uit wachtlijst/))).toBeTruthy()
    // expect(sentMail.filter(m => m.subject.match(/gewijzigd/)).length).toBe(1);

    res = await request(app).get('/api/reservering/' + reserveringId2);
    expect(res.body.wachtlijst).toBe(false);

    res = await request(app).get('/api/uitvoering/' + uitvoeringId1);
    expect(res.body.wachtlijst).toBe(0);
    expect(res.body.tekoop).toBe(0);
  });
});
