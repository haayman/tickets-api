const request = require("supertest");
const config = require("config");
const mongoose = require("mongoose");
let app = require("../../app");
const { Voorstelling } = require("../../models/Voorstelling");

const dbConfig = config.get("database");

let authToken;

beforeAll(async () => {
  const admin = new Voorstelling({
    voorstellingname: "administrator",
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
  await Voorstelling.deleteMany({});
});

describe("/voorstellingen", () => {
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
        .get("/voorstellingen")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.title === "voorstelling1")).toBeTruthy();
      expect(res.body.some(u => u.title === "voorstelling2")).toBeTruthy();
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
          .get("/voorstellingen/" + id)
          .set("x-auth-token", authToken);
        expect(res.status).toBe(200);
        expect(res.body._id.toString()).toBe(id);
      });

      it("should return 404 invalid id", async () => {
        const res = await request(app)
          .get("/voorstellingen/1")
          .set("x-auth-token", authToken);
        expect(res.status).toBe(404);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/voorstellingen/41224d776a326fb40f000001")
          .set("x-auth-token", authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });
  // describe("/POST", () => {
  //   // --------- validation errors -----

  //   it("should fail validation. password missing return 400", async () => {
  //     const res = await request(app)
  //       .post("/voorstellingen/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         voorstellingname: "voorstelling1",
  //         name: "Voorstelling 1",
  //         email: "voorstelling1@plusleo.nl",
  //         // password: "Dit is een goed",
  //         role: "speler"
  //       });
  //     expect(res.status).toBe(400);
  //   });

  //   it("should fail validation. invalid role. return 400", async () => {
  //     const res = await request(app)
  //       .post("/voorstellingen/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         voorstellingname: "voorstelling1",
  //         name: "Voorstelling 1",
  //         email: "voorstelling1@plusleo.nl",
  //         password: "Dit is een goed",
  //         role: "role"
  //       });
  //     expect(res.status).toBe(400);
  //   });

  //   it("Voorstelling already exists. return 400", async () => {
  //     await request(app)
  //       .post("/voorstellingen/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         voorstellingname: "voorstelling1",
  //         name: "Voorstelling 1",
  //         email: "voorstelling1@plusleo.nl",
  //         password: "Dit is een goed",
  //         role: "role"
  //       });
  //     const res = await request(app)
  //       .post("/voorstellingen/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         voorstellingname: "voorstelling1",
  //         name: "Voorstelling 1",
  //         email: "voorstelling1@plusleo.nl",
  //         password: "Dit is een goed",
  //         role: "role"
  //       });

  //     expect(res.status).toBe(400);
  //   });

  //   it("should successfully post", async () => {
  //     const res = await request(app)
  //       .post("/voorstellingen/")
  //       .set("x-auth-token", authToken)
  //       .send({
  //         voorstellingname: "voorstelling1",
  //         name: "Voorstelling 1",
  //         email: "voorstelling1@plusleo.nl",
  //         password: "Dit is een goed",
  //         role: "speler"
  //       });
  //     expect(res.status).toBe(200);
  //     expect(res.body._id).toBeDefined();
  //     expect(res.header).toHaveProperty("x-auth-token");

  //     const voorstelling = await Voorstelling.find({
  //       voorstellingname: "voorstelling1"
  //     });
  //     expect(voorstelling).not.toBeNull();
  //   });
  // });
});
