const request = require("supertest");
const config = require("config");
const mongoose = require("mongoose");
let app = require("../../app");
const { User } = require("../../models/User");

const dbConfig = config.get("database");

let spelerToken, adminToken;

beforeAll(async () => {
  // login
  const admin = new User({
    username: "administrator",
    name: "Admin",
    password: "my name is admin",
    email: "admin@plusleo.nl",
    role: "admin"
  });
  await admin.save();
  adminToken = admin.getAuthToken();
  await admin.delete();

  // login
  const speler = new User({
    username: "speler",
    name: "Speler",
    password: "my name is admin",
    email: "speler@plusleo.nl",
    role: "speler"
  });
  await speler.save();
  spelerToken = speler.getAuthToken();
  await speler.delete();
});

//beforeAll(async () => (app = require("../../app")));
afterAll(done => mongoose.disconnect(done));

describe("auth middleware", () => {
  it("should return 401. no x-auth-token", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("should return 403. wrong role", async () => {
    const res = await request(app)
      .get("/users")
      .set("x-auth-token", spelerToken);
    expect(res.status).toBe(403);
  });

  it("should return 200. access allowed", async () => {
    const res = await request(app)
      .get("/users")
      .set("x-auth-token", adminToken);
    expect(res.status).toBe(200);
  });
});
