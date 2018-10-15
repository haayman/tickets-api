const request = require("supertest");
const config = require("config");
const mongoose = require("mongoose");
let app = require("../../app");
const { User } = require("../../models/User");

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
  await User.deleteMany({});
});

describe("/users", () => {
  describe("/GET", () => {
    it("should return all users", async () => {
      try {
        await User.collection.insertMany([
          {
            username: "user1",
            name: "User 1",
            email: "user@plusleo.nl",
            password: "test1",
            role: "speler"
          },
          {
            username: "user2",
            name: "User 2",
            email: "user2@plusleo.nl",
            password: "test2",
            role: "speler"
          }
        ]);
      } catch (ex) {
        //ignore
      }
      const res = await request(app)
        .get("/users")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.username === "user1")).toBeTruthy();
      expect(res.body.some(u => u.username === "user2")).toBeTruthy();
    });

    describe("/GET/id", () => {
      it("should return specific user", async () => {
        let user = new User({
          username: "user1",
          name: "User 1",
          email: "user@plusleo.nl",
          password: "test1",
          role: "speler"
        });
        await user.save();

        const id = user._id.toString();
        const res = await request(app)
          .get("/users/" + id)
          .set("x-auth-token", authToken);
        expect(res.status).toBe(200);
        expect(res.body._id.toString()).toBe(id);
      });

      it("should return 404 invalid id", async () => {
        const res = await request(app)
          .get("/users/1")
          .set("x-auth-token", authToken);
        expect(res.status).toBe(404);
      });

      it("should return 404 not found", async () => {
        const res = await request(app)
          .get("/users/41224d776a326fb40f000001")
          .set("x-auth-token", authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });
  describe("/POST", () => {
    // --------- validation errors -----

    it("should fail validation. password missing return 400", async () => {
      const res = await request(app)
        .post("/users/")
        .set("x-auth-token", authToken)
        .send({
          username: "user1",
          name: "User 1",
          email: "user1@plusleo.nl",
          // password: "Dit is een goed",
          role: "speler"
        });
      expect(res.status).toBe(400);
    });

    it("should fail validation. invalid role. return 400", async () => {
      const res = await request(app)
        .post("/users/")
        .set("x-auth-token", authToken)
        .send({
          username: "user1",
          name: "User 1",
          email: "user1@plusleo.nl",
          password: "Dit is een goed",
          role: "role"
        });
      expect(res.status).toBe(400);
    });

    it("User already exists. return 400", async () => {
      await request(app)
        .post("/users/")
        .set("x-auth-token", authToken)
        .send({
          username: "user1",
          name: "User 1",
          email: "user1@plusleo.nl",
          password: "Dit is een goed",
          role: "role"
        });
      const res = await request(app)
        .post("/users/")
        .set("x-auth-token", authToken)
        .send({
          username: "user1",
          name: "User 1",
          email: "user1@plusleo.nl",
          password: "Dit is een goed",
          role: "role"
        });

      expect(res.status).toBe(400);
    });

    it("should successfully post", async () => {
      const res = await request(app)
        .post("/users/")
        .set("x-auth-token", authToken)
        .send({
          username: "user1",
          name: "User 1",
          email: "user1@plusleo.nl",
          password: "Dit is een goed",
          role: "speler"
        });
      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.header).toHaveProperty("x-auth-token");

      const user = await User.find({ username: "user1" });
      expect(user).not.toBeNull();
    });
  });
});
