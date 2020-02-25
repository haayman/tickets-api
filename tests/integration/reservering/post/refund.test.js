jest.setTimeout(3000000);
const root = '../';
const ROOT = process.env.ROOT;
const request = require('supertest');
// https://www.npmjs.com/package/nodemailer-mock
const nodemailerMock = require('nodemailer-mock');

require(`${root}/setup.js`);

const { createReservering } = require(`${root}/createReservering`);

let app = require(`${ROOT}/app`);
const createVoorstelling = require(`${root}/createVoorstelling`);

let voorstelling;

beforeAll(async () => {
  voorstelling = await createVoorstelling();
});

describe('/reservering', () => {
  describe('/post', () => {
    // ===============================================================================================

    it('should completely refund if set to 0', async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id;

      let res = await createReservering(request(app), {
        naam: 'noshow',
        email: 'noshow@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 0
      res = await request(app)
        .put('/api/reservering/' + reserveringId1)
        .send({
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

    it('should refund 1 ticket ', async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id;

      let res = await createReservering(request(app), {
        naam: 'noshow',
        email: 'noshow@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 0
      res = await request(app)
        .put('/api/reservering/' + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[0],
              aantal: 1
            }
          ]
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

    it.skip('should not refund vrijkaartje ', async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id;

      let res = await createReservering(request(app), {
        naam: 'friend',
        email: 'friend@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[2],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // zet aantal op 1
      res = await request(app)
        .put('/api/reservering/' + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
              prijs: voorstelling.prijzen[2],
              aantal: 1
            }
          ]
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

    it('should completely refund if deleted', async () => {
      const uitvoeringId = voorstelling.uitvoeringen[0].id;

      let res = await createReservering(request(app), {
        naam: 'noshow',
        email: 'noshow@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      res = await request(app).del('/api/reservering/' + reserveringId1);

      let sentMail = nodemailerMock.mock.sentMail();
      // expect(
      //   sentMail.find((m) => m.subject.match(/Gewijzigde bestelling/))
      // ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€20.00 teruggestort/))
      ).toBeTruthy();
    });

    // ===============================================================================================

    it.skip('should partly refund', async () => {
      /*
      1) reserveer 2 volwassen kaarten
      2) wijzig 1 kaart van volwassen naar kind
        - € 2.50 refund

        N.B. WERKT NOG NIET
      */
      const uitvoeringId = voorstelling.uitvoeringen[0].id;

      let res = await createReservering(request(app), {
        naam: 'ouder',
        email: 'ouder@mail.example',
        uitvoeringId: uitvoeringId,
        tickets: [
          {
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }
        ]
      });

      const reserveringId1 = res.reservering.body.id;

      nodemailerMock.mock.reset();

      // wijzig prijs van 1 van de kaarten
      // gebruik niet updateReservering, want in principe komt er geen betaling aan te pas
      res = await request(app)
        .put('/api/reservering/' + reserveringId1)
        .send({
          id: reserveringId1,
          uitvoeringId: uitvoeringId,
          tickets: [
            {
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
      expect(res.body.bedrag).toBe(
        voorstelling.prijzen[0].prijs + voorstelling.prijzen[1].prijs
      );
      expect(
        sentMail.find((m) => m.subject.match(/Gewijzigde reservering/))
      ).toBeTruthy();
      expect(
        sentMail.find((m) => m.subject.match(/€2.50 teruggestort/))
      ).toBeTruthy();
    });
  });
});
