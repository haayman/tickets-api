jest.setTimeout(3000000);
const request = require("supertest");
const clone = require("lodash/clone");
require('axios-debug-log');
const nock = require('nock');

process.env.DEBUG = 'axios';

// https://www.npmjs.com/package/nodemailer-mock
const nodemailerMock = require('nodemailer-mock');
jest.setMock('nodemailer', nodemailerMock);

// disable test
function _it(description) {
  // console.log('skipped ', description);
}

const {
  createReservering,
  updateReservering
} = require('./createReservering');

let app = require("../../../app");
const {
  User,
  Reservering,
  Voorstelling,
  sequelize
} = require("../../../models/");
const getAuthToken = require("./getAuthToken");
const createVoorstelling = require("./createVoorstelling");

let authToken, voorstelling;

beforeAll(async () => {
  await sequelize.sync({
    force: true
  });
  authToken = await getAuthToken();
  voorstelling = await createVoorstelling();
  // console.log("voorstelling created");
});

afterAll(async (done) => {
  // console.log("delete voorstelling");
  await Voorstelling.destroy({
    where: {},
    truncate: true
  });
  jest.resetAllMocks();
  done();
});

afterEach(async () => {
  // console.log("delete reservering");
  await Reservering.destroy({
    where: {},
    truncate: true
  });
  nodemailerMock.mock.reset();
  nock.cleanAll();
});

describe("/reservering", () => {
  describe("/GET", () => {
    it("should return alle reserveringen", async () => {
      try {
        await Reservering.bulkCreate(
          [{
              naam: "naam1",
              email: "naam1@plusleo.nl",
              uitvoeringId: voorstelling.uitvoeringen[0].id,
              tickets: [{
                prijsId: voorstelling.prijzen[0].id
              }]
            },
            {
              naam: "naam2",
              email: "naam@plusleo.nl",
              uitvoeringId: voorstelling.uitvoeringen[0].id,
              tickets: [{
                prijsId: voorstelling.prijzen[1].id
              }]
            }
          ], {
            include: [{
                association: Reservering.Tickets
              },
              {
                association: Voorstelling.Uitvoeringen
              }
            ]
          }
        );
      } catch (ex) {
        console.log(ex);
        throw (ex);
      }
      const res = await request(app)
        .get("/api/reservering")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.naam === "naam1")).toBeTruthy();
      expect(res.body.some(u => u.naam === "naam2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific reservering", async () => {
        let reservering;
        try {
          reservering = await Reservering.create({
            naam: "naam3",
            email: "naam3@plusleo.nl",
            uitvoeringId: voorstelling.uitvoeringen[0].id
          });
        } catch (ex) {
          console.log(ex);
          throw (ex)
        }

        const id = reservering.id;
        const res = await request(app)
          .get("/api/reservering/" + id)
          .set("x-auth-token", authToken);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/api/reservering/1")
          .set("x-auth-token", authToken);
        expect(res.status).toBe(404);
      });
    });
  });

  describe("/post", () => {
    it("succesvolle reservering", async () => {
      try {
        const {
          reserveringResult,
          paymentResult
        } = await createReservering(request(app), {
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
        expect(sentMail[0].subject).toMatch(/ticket besteld/);
        expect(sentMail[1].subject).toMatch(/ticket 2x/);

      } catch (ex) {
        //debugger;
        console.log(ex);
        throw (ex);
      }
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
      try {
        // require('./mockPayment')('payment1', 'paid')

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
      } catch (ex) {
        //debugger;
        console.log(ex);
        throw (ex);
      }
    });

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
      try {
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
        expect(sentMail.find(m => m.subject.match(/Gewijzigde reservering/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/€10.00 teruggestort/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/uit wachtlijst/))).toBeTruthy();
        expect(sentMail[2].html).toMatch(/alsnog te betalen/);

      } catch (ex) {
        //debugger;
        console.log(ex);
        throw (ex);
      }
    });

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
      try {

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
        expect(sentMail[0].subject).toMatch(/Gewijzigde reservering/);
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
        expect(sentMail.find(m => m.subject.match(/ticket besteld/))).toBeTruthy();
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
        expect(sentMail.find(m => m.subject.match(/ticket besteld/))).toBeTruthy();
        expect(sentMail.find(m => m.subject.match(/1x/))).toBeTruthy();

      } catch (ex) {
        //debugger;
        console.log(ex);
        throw (ex);

      }
    });


  });
  // ===============================================================================================

  it("should completely refund if set to 0", async () => {
    try {
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
      expect(sentMail.find(m => m.subject.match(/Gewijzigde reservering/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€20.00 teruggestort/))).toBeTruthy();


    } catch (ex) {
      //debugger;
      console.log(ex);
      throw (ex);
    }
  });

  // ===============================================================================================

  it("should completely refund if deleted", async () => {
    try {
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

      debugger;
      res = await request(app).del("/api/reservering/" + reserveringId1)

      debugger;
      let sentMail = nodemailerMock.mock.sentMail();
      expect(sentMail.find(m => m.subject.match(/Gewijzigde reservering/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€20.00 teruggestort/))).toBeTruthy();


    } catch (ex) {
      //debugger;
      console.log(ex);
      throw (ex);
    }
  });


  // ===============================================================================================

  it("should partly refund", async () => {
    /* 
    1) reserveer 2 volwassen kaarten
    2) wijzig 1 kaart van volwassen naar kind
      - € 2.50 refund
    */
    try {
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

      debugger;
      let sentMail = nodemailerMock.mock.sentMail();
      expect(res.body.aantal).toBe(2);
      expect(res.body.onbetaaldeTickets.length).toBe(0);
      expect(res.body.bedrag).toBe(voorstelling.prijzen[0].prijs + voorstelling.prijzen[1].prijs);
      expect(sentMail.find(m => m.subject.match(/Gewijzigde reservering/))).toBeTruthy();
      expect(sentMail.find(m => m.subject.match(/€2.50 teruggestort/))).toBeTruthy();


    } catch (ex) {
      debugger;
      console.log(ex);
      throw (ex);
    }
  });


  // 1) maak voorstelling met 2 plaatsen binnen 14 dagen
  // 2) r1: reserveer 2 kaarten
  // 3) r2: reserveer 1 kaart
  // 4) r1: annuleert
  //    - mail: 'gewijzigd'. 'waarvan 2 te koop'
  //    - mail: 'uit_wachtlijst'

  // describe("/POST", () => {
  //   // --------- validation errors -----

  //   it("should fail validation. missing description. return 400", async () => {
  //     const res = await request(app)
  //       .post("/voorstelling/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         title: "title1",
  //         // description: "Description 1",
  //         active: true,
  //         url: "https://plusleo.nl/",
  //         locatie: "locatie 1",
  //         opmerkingen: "opmerkingen1",
  //         prijzen: [],
  //         uitvoeringen: []
  //       });
  //     expect(res.status).toBe(400);
  //   });

  //   it("should fail validation. missing prijs.description. return 400", async () => {
  //     const res = await request(app)
  //       .post("/voorstelling/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         title: "title1",
  //         description: "Description 1",
  //         aantal_plaatsen: 60,
  //         active: true,
  //         url: "https://plusleo.nl/",
  //         locatie: "locatie 1",
  //         opmerkingen: "opmerkingen1",
  //         prijzen: [
  //           {
  //             // description: "volwassenen",
  //             number: 10
  //           }
  //         ],
  //         uitvoeringen: []
  //       });
  //     expect(res.status).toBe(400);
  //   });

  //   it("should fail validation. missing uitvoering.aanvang. return 400", async () => {
  //     const res = await request(app)
  //       .post("/voorstelling/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         title: "title1",
  //         description: "Description 1",
  //         aantal_plaatsen: 60,
  //         active: true,
  //         url: "https://plusleo.nl/",
  //         locatie: "locatie 1",
  //         opmerkingen: "opmerkingen1",
  //         prijzen: [
  //           {
  //             description: "volwassenen",
  //             prijs: 10
  //           },
  //           {
  //             description: "kinderen",
  //             prijs: 5
  //           },
  //           {
  //             description: "vrijkaartje",
  //             prijs: 0
  //           }
  //         ],
  //         uitvoeringen: [
  //           {
  //             aanvang: new Date(2018, 1, 1),
  //             deur_open: new Date(2018, 1, 1),
  //             aantal_plaatsen: -1
  //           }
  //         ]
  //       });
  //     expect(res.status).toBe(400);
  //   });

  //   it("should successfully post", async () => {
  //     const res = await request(app)
  //       .post("/voorstelling/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         title: "title1",
  //         description: "Description 1",
  //         active: true,
  //         url: "https://plusleo.nl/",
  //         locatie: "locatie 1",
  //         opmerkingen: "opmerkingen1",
  //         prijzen: [],
  //         uitvoeringen: []
  //       });
  //     expect(res.status).toBe(200);
  //     expect(res.body._id).toBeDefined();

  //     const voorstelling = await Voorstelling.find({
  //       title: "title1"
  //     });
  //     expect(voorstelling).not.toBeNull();
  //   });
  // });
});