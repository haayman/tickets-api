process.env.NODE_CONFIG_DIR = "./config";

const { User } = require("../../../models/User");
const jwt = require("jsonwebtoken");
const config = require("config");

describe("getAuthToken", () => {
  const user = new User({ _id: 1, role: "admin" });
  let token = user.getAuthToken();
  let decoded = jwt.decode(token, config.get("jwtPrivateKey"));
  it("should be valid token", () => {
    expect(decoded).toMatchObject({ role: "admin" });
  });
});
