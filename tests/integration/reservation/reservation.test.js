const request = require("supertest");
const config = require("config");
const mongoose = require("mongoose");
let app = require("../../app");
const { User } = require("../../../models/User");
const { Reservering } = require("../../../models/Reservering");

const dbConfig = config.get("database");

let authToken;

beforeAll(async () => {
  const admin = new User({
    username: "administrator",
    name: "Admin",
    password: "my name is admin",
    email: "admin@plusleo.nl",
    role: "admin"
  });
  await admin.save();
  authToken = admin.getAuthToken();
  await admin.delete();
});

//beforeAll(async () => (app = require("../../app")));
afterAll(done => mongoose.disconnect(done));

afterEach(async () => {
  await Reservering.deleteMany({});
});

describe("/voorstelling", () => {
  describe("/GET", () => {
    it("should return all voorstellingen", async () => {
      try {
        await Voorstelling.collection.insertMany([
          {
            title: "title1",
            description: "Description 1",
            aantal_plaatsen: 60,
            active: true,
            url: "https://plusleo.nl/",
            locatie: "locatie 1",
            opmerkingen: "opmerkingen1",
            prijzen: [],
            uitvoeringen: []
          },
          {
            title: "title2",
            description: "Description 2",
            aantal_plaatsen: 60,
            active: true,
            url: "https://plusleo.nl/",
            locatie: "locatie 2",
            opmerkingen: "opmerkingen2",
            prijzen: [],
            uitvoeringen: []
          }
        ]);
      } catch (ex) {
        //ignore
      }
      const res = await request(app)
        .get("/voorstelling")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.title === "title1")).toBeTruthy();
      expect(res.body.some(u => u.title === "title2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific voorstelling", async () => {
        let voorstelling = new Voorstelling({
          title: "title1",
          description: "Description 1",
          aantal_plaatsen: 60,
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: []
        });
        await voorstelling.save();

        const id = voorstelling._id.toString();
        const res = await request(app)
          .get("/voorstelling/" + id)
          .set("x-auth-token", authToken);
        expect(res.status).toBe(200);
        expect(res.body._id.toString()).toBe(id);
      });

      it("should return 404 invalid id", async () => {
        const res = await request(app)
          .get("/voorstelling/1")
          .set("x-auth-token", authToken);
        expect(res.status).toBe(404);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/voorstelling/41224d776a326fb40f000001")
          .set("x-auth-token", authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });

  describe("/POST", () => {
    // --------- validation errors -----

    it("should fail validation. missing description. return 400", async () => {
      const res = await request(app)
        .post("/voorstelling/")
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
        .post("/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          aantal_plaatsen: 60,
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [
            {
              // description: "volwassenen",
              number: 10
            }
          ],
          uitvoeringen: []
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. missing uitvoering.aanvang. return 400", async () => {
      const res = await request(app)
        .post("/voorstelling/")
        .set("x-auth-token", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          aantal_plaatsen: 60,
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [
            {
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
          uitvoeringen: [
            {
              aanvang: new Date(2018, 1, 1),
              deur_open: new Date(2018, 1, 1),
              aantal_plaatsen: -1
            }
          ]
        });
      expect(res.status).toBe(400);
    });

    it("should successfully post", async () => {
      const res = await request(app)
        .post("/voorstelling/")
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
      expect(res.body._id).toBeDefined();

      const voorstelling = await Voorstelling.find({
        title: "title1"
      });
      expect(voorstelling).not.toBeNull();
    });
  });
});
