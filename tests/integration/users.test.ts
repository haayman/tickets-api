jest.setTimeout(3000000);
import {
  EntityManager,
  RequestContext,
  EntityRepository,
} from "@mikro-orm/core";
import request from "supertest";
import appLoader from "../../app";
import { User } from "../../models/User";
import getAuthToken from "../getAuthToken";
import Container from "typedi";
import faker from "community-faker";
import close from "../close";

let authToken;
let em: EntityManager;
let userRepository: EntityRepository<User>;
let app;

beforeAll(async () => {
  authToken = getAuthToken();
  app = await appLoader();
});

afterAll(async () => {
  await close(em);
});

beforeEach(async () => {
  em = (Container.get("em") as EntityManager).fork();
  userRepository = em.getRepository<User>("User");
  const connection = em.getConnection();
  await connection.execute("delete from users");
  await em.flush();
});

describe("/api/user", () => {
  describe("/GET", () => {
    it("should return all users", async () => {
      try {
        const users = [
          {
            username: "user1",
            name: faker.name.findName(),
            email: "user@plusleo.nl",
            password: "test1",
            role: "speler",
          },
          {
            username: "user2",
            name: "User 2",
            email: "user2@plusleo.nl",
            password: "test2",
            role: "speler",
          },
        ];
        for (const userData of users) {
          const user = userRepository.create(userData);
          em.persist(user);
        }
        await em.flush();
      } catch (ex) {
        console.log(ex);
      }
      const res = await request(app)
        .get("/api/user")
        .set("Authorization", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((u) => u.username === "user1")).toBeTruthy();
      expect(res.body.some((u) => u.username === "user2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific user", async () => {
        let user = userRepository.create({
          username: "user1",
          name: faker.name.findName(),
          email: "user@plusleo.nl",
          password: "test1",
          role: "speler",
        });
        await userRepository.persistAndFlush(user);

        const id = user.id;
        const res = await request(app)
          .get("/api/user/" + id)
          .set("Authorization", authToken);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/api/user/0")
          .set("Authorization", authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });
  describe("/POST", () => {
    // --------- validation errors -----

    it("should fail validation. password missing return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          // password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. name missing return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          // name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(400);
    });
    it("should fail validation. username missing return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          // username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. email missing return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          // email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. password missing return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          // password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. missing role. return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          // role: "role",
        });
      expect(res.status).toBe(400);
    });

    it.skip("should fail validation. invalid role. return 400", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "role",
        });
      expect(res.status).toBe(400);
    });

    it("User already exists. return 400", async () => {
      await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });

      expect(res.status).toBe(400);
    });

    it("should successfully post", async () => {
      const res = await request(app)
        .post("/api/user/")
        .set("Authorization", authToken)
        .send({
          username: "user1",
          name: faker.name.findName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          role: "speler",
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();

      const user = await userRepository.find({
        username: "user1",
      });
      expect(user).not.toBeNull();
    });
  });
});
