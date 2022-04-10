import request from "supertest";
import appLoader from "../../app";
import getAuthToken from "../getAuthToken";

let spelerToken, adminToken;

let app;

beforeAll(async () => {
  app = await appLoader();
  adminToken = getAuthToken("admin");
  spelerToken = getAuthToken("speler");
});

describe("auth middleware", () => {
  it("should return 401. no Authorization", async () => {
    const res = await request(app).get("/api/user");
    expect(res.status).toBe(401);
  });

  it("should return 403. wrong role", async () => {
    const res = await request(app)
      .get("/api/user")
      .set("Authorization", spelerToken);
    expect(res.status).toBe(403);
  });

  it("should return 200. access allowed", async () => {
    const res = await request(app)
      .get("/api/user")
      .set("Authorization", adminToken);
    expect(res.status).toBe(200);
  });
});
