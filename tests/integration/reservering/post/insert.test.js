jest.setTimeout(3000000);
const root = '../'
process.env.NODE_CONFIG_DIR = __dirname + `${root}../../../../config/`;
process.env.NODE_ENV = 'test';
const request = require("supertest");
const clone = require("lodash/clone");
require(`${root}/setup.js`)

const nodemailerMock = require('nodemailer-mock');

const createVoorstelling = require(`${root}/createVoorstelling`);

const {  createReservering} = require(`${root}/createReservering`);
let app = require(`${root}../../../app`);


let voorstelling;

beforeAll(async () => {
	voorstelling = await createVoorstelling();
});

describe("/reservering", async () => {
  describe("/post", () => {
    it("succesvolle reservering", async () => {
				await createReservering(request(app), {
          naam: "Test",
          email: "arjen.haayman+test@gmail.com",
          uitvoeringId: voorstelling.uitvoeringen[0].id,
          tickets: [{
            prijs: voorstelling.prijzen[0],
            aantal: 2
          }]
        })

        const sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail.length).toBe(2);
        expect(sentMail[0].subject).toMatch(/kaarten besteld/);
        expect(sentMail[1].subject).toMatch(/Kaarten voor 2x/);
    });

    it('not modify prijs', async () => {
      const newPrijs = clone(voorstelling.prijzen[0]);
      newPrijs.prijs = 200;
      const res = await request(app)
        .post('/api/reservering')
        .send({
          "naam": "Test",
          "email": "arjen.haayman+test@gmail.com",
          "uitvoeringId": voorstelling.uitvoeringen[0].id,
          "tickets": [{
            "prijs": newPrijs,
            "aantal": 2,
          }, {
            "prijs": voorstelling.prijzen[1],
            "aantal": 0,
          }, {
            "prijs": voorstelling.prijzen[2],
            "aantal": 0,
          }],
        });
      expect(res.body.openstaandBedrag).toBe(20);
    })

    it("should be wachtlijst", async () => {
        let res = await request(app)
          .post("/api/reservering")
          .send({
            naam: "Test",
            email: "arjen.haayman+test@gmail.com",
            uitvoeringId: voorstelling.uitvoeringen[0].id,
            tickets: [{
                prijs: voorstelling.prijzen[0],
                aantal: 3
              },
              {
                prijs: voorstelling.prijzen[1],
                aantal: 0
              },
              {
                prijs: voorstelling.prijzen[2],
                aantal: 0
              }
            ]
          });

        expect(res.status).toBe(200);
        expect(res.body.id).toBeDefined();
        expect(res.body.openstaandBedrag).toBe(30);
        expect(res.body.onbetaaldeTickets.length).toBe(3);
        expect(res.body.wachtlijst).toBe(true);

        const sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail.length).toBe(1);
        expect(sentMail[0].subject).toMatch(/wachtlijst/);
    });

  });

});
