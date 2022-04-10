import { EntityManager, EntityRepository } from "@mikro-orm/core";
import request from "supertest";
import Container from "typedi";
import appLoader from "../../../app";
import { Voorstelling } from "../../../models/Voorstelling";
import getAuthToken from "../../getAuthToken";

let authToken;
let em: EntityManager;
let voorstellingRepository: EntityRepository<Voorstelling>;
let app;

beforeAll(async () => {
  app = await appLoader();
  authToken = getAuthToken();
});

beforeEach(async () => {
  em = (Container.get("em") as EntityManager).fork();
  voorstellingRepository = em.getRepository<Voorstelling>("Voorstelling");
  const connection = em.getConnection();
  await connection.execute("delete from voorstellingen");
  await em.flush();
});

describe("/api/voorstelling", () => {
  describe("/GET", () => {
    it("should return all voorstellingen", async () => {
      try {
        const voorstellingen = [
          {
            title: "title1",
            description: "Description 1",
            active: true,
            url: "https://plusleo.nl/",
            locatie: "locatie 1",
            opmerkingen: "opmerkingen1",
            prijzen: [],
            uitvoeringen: [],
          },
          {
            title: "title2",
            description: "Description 2",
            active: true,
            url: "https://plusleo.nl/",
            locatie: "locatie 2",
            opmerkingen: "opmerkingen2",
            prijzen: [],
            uitvoeringen: [],
          },
        ];
        for (const data of voorstellingen) {
          const voorstelling = voorstellingRepository.create(data);
          em.persist(voorstelling);
        }
        await em.flush();
      } catch (ex) {
        console.log(ex);
        throw ex;
      }
      const res = await request(app).get("/api/voorstelling");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((u) => u.title === "title1")).toBeTruthy();
      expect(res.body.some((u) => u.title === "title2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific voorstelling", async () => {
        let voorstelling = voorstellingRepository.create({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: [],
        });
        await em.persistAndFlush(voorstelling);

        const id = voorstelling.id;
        const res = await request(app).get("/api/voorstelling/" + id);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
      });

      it("should return 404 not found", async () => {
        const res = await request(app).get("/api/voorstelling/0");
        expect(res.status).toBe(404);
      });
    });
  });

  describe("/POST", () => {
    // --------- validation errors -----

    it("should fail. No Access. return 401", async () => {
      const res = await request(app).post("/api/voorstelling/").send({
        title: "title1",
        description: "Description 1",
        active: true,
        url: "https://plusleo.nl/",
        locatie: "locatie 1",
        opmerkingen: "opmerkingen1",
        prijzen: [],
        uitvoeringen: [],
      });
      expect(res.status).toBe(401);
    });

    it("should fail. Speler has no access. return 403", async () => {
      const speler = getAuthToken("speler");
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("Authorization", speler)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: [],
        });
      expect(res.status).toBe(403);
    });

    it("should fail validation. missing description. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("Authorization", authToken)
        .send({
          title: "title1",
          // description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: [],
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. missing prijs.description. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("Authorization", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [
            {
              // description: "volwassenen",
              prijs: 10,
            },
          ],
          uitvoeringen: [],
        });
      expect(res.status).toBe(400);
    });

    it.skip("should fail validation. uitvoering.aantal_plaatsen<1. return 400", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("Authorization", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [],
          uitvoeringen: [
            {
              aanvang: new Date(2018, 1, 1),
              deur_open: new Date(2018, 1, 1),
              aantal_plaatsen: -1,
            },
          ],
        });
      expect(res.status).toBe(400);
    });

    it("should successfully post", async () => {
      const res = await request(app)
        .post("/api/voorstelling/")
        .set("Authorization", authToken)
        .send({
          title: "title1",
          description: "Description 1",
          active: true,
          url: "https://plusleo.nl/",
          locatie: "locatie 1",
          opmerkingen: "opmerkingen1",
          prijzen: [
            {
              description: "volwassenen",
              prijs: 10,
            },
            {
              description: "kinderen",
              prijs: 7.5,
            },
          ],

          uitvoeringen: [
            {
              aanvang: new Date(2018, 1, 1),
              deur_open: new Date(2018, 1, 1),
              aantal_plaatsen: 20,
            },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();

      const voorstelling = await voorstellingRepository.findOne(
        {
          title: "title1",
        },
        ["prijzen", "uitvoeringen"]
      );
      expect(voorstelling).not.toBeNull();
      expect(voorstelling.prijzen.getItems().length).toBe(2);
      expect(
        voorstelling.prijzen.getItems().find((p) => p.description == "kinderen")
          .prijs
      ).toBe(7.5);
      expect(voorstelling.uitvoeringen.getItems()[0].vrije_plaatsen).toBe(20);
    });
  });
});
