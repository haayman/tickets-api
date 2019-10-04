jest.setTimeout(3000000);
process.env.NODE_CONFIG_DIR = __dirname + "/../../../config/";
process.env.NODE_ENV = 'test';
const request = require("supertest");
const config = require("config");
let app = require("../../../app");
const {
  User,
  Voorstelling
} = require("../../../models");
const {
  Model
} = require('objection');
const Knex = require('knex');

const knex = Knex(config.get('database'));

Model.knex(knex);

let authToken;

beforeAll(async () => {
  const admin = await User.query().insert({
    username: "administrator",
    name: "Admin",
    password: "my name is admin",
    email: "admin@plusleo.nl",
    role: "admin"
  });
  authToken = admin.getAuthToken();
  await admin.$query().delete();
  console.log('deleted');
});

//beforeAll(async () => (app = require("../../app")));
// afterAll(done => mongoose.disconnect(done));

afterEach(async () => {
  await User.query().delete();
  await Voorstelling.query().delete();
});

afterAll(() => {
  knex.destroy();
})

describe("/voorstelling", () => {
  describe("/GET", () => {
    it("should return all voorstellingen", async (done) => {
      try {
        await Voorstelling.query().insert({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: []
        });
        await Voorstelling.query().insert({
          title: "title2",
          description: "Description 2",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 2",
          opmerkingen: "opmerkingen2",
          prijzen: [],
          uitvoeringen: []
        });
        done();
      } catch (ex) {
        //ignore
        done.fail
      }
      const res = await request(app)
        .get("/api/voorstelling")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.title === "title1")).toBeTruthy();
      expect(res.body.some(u => u.title === "title2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific voorstelling", async () => {
        let voorstelling = await Voorstelling.query().insert({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: []
        });

        const id = voorstelling.id.toString();
        const res = await request(app)
          .get("/api/voorstelling/" + id)
          .set("x-auth-token", authToken);
        expect(res.status).toBe(200);
        expect(res.body.id.toString()).toBe(id);
      });

      it("should return 404 invalid id", async () => {
        const res = await request(app)
          .get("/api/voorstelling/1")
          .set("x-auth-token", authToken);
        expect(res.status).toBe(404);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/api/voorstelling/41224d776a326fb40f000001")
          .set("x-auth-token", authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });

  describe("/POST", () => {
    // --------- validation errors -----

    it("should fail validation. missing description. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          // description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. missing prijs.description. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [{
            // description: "volwassenen",
            number: 10
          }],
          uitvoeringen: []
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. missing uitvoering.aanvang. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [{
              description: "volwassenen",
              prijs: 10
            },
            {
              description: "kinderen",
              prijs: 5
            },
            {
              description: "vrijkaartje",
              prijs: 0
            }
          ],
          uitvoeringen: [{
            aanvang: new Date(2018, 1, 1),
            deur_open: new Date(2018, 1, 1),
            aantal_plaatsen: 10
          }]
        });
      expect(res.status).toBe(400);
    });

    it("should successfully post", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();

      const voorstelling = await Voorstelling.query().where({
        title: "title1"
      });
      expect(voorstelling).not.toBeNull();
    });
  });
});
