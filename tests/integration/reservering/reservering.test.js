jest.setTimeout(30000);
const request = require("supertest");
const clone = require("lodash/clone");
const nodemailerMock = require('nodemailer-mock');

jest.setMock('nodemailer', nodemailerMock);

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
  console.log("voorstelling created");
});

afterAll(async () => {
  console.log("delete voorstelling");
  await Voorstelling.destroy({
    where: {},
    truncate: true
  });
  jest.resetAllMocks();
});

afterEach(async () => {
  console.log("delete reservering");
  await Reservering.destroy({
    where: {},
    truncate: true
  });
  nodemailerMock.mock.reset();
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
    it("should return succes", async () => {
      try {
        let res = await request(app)
          .post("/api/reservering")
          .send({
            naam: "Test",
            email: "arjen.haayman+test@gmail.com",
            uitvoeringId: voorstelling.uitvoeringen[0].id,
            tickets: [{
                prijs: voorstelling.prijzen[0],
                aantal: 2
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
        expect(res.body.openstaandBedrag).toBe(20);
        expect(res.body.onbetaaldeTickets.length).toBe(2);

        const id = res.body.id;

        const sentMail = nodemailerMock.mock.sentMail();
        expect(sentMail.length).toBe(1);
        expect(sentMail[0].subject).toMatch(/ticket besteld/);

        res = await request(app).get(`/api/reservering/${id}?include[]=tickets`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBeDefined();
        expect(res.body.paymentUrl).toBeDefined();
      } catch (ex) {
        console.log(ex);
      }
    });

    it('should not modify prijs', async () => {
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
  });

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