process.env.NODE_CONFIG_DIR = "../../../config";

const {
  User
} = require("../../../models");
const jwt = require("jsonwebtoken");
const config = require("config");

describe("getAuthToken", () => {
  const user = User.build({
    id: 1,
    role: "admin"
  });
  let token = user.getAuthToken();
  let decoded = jwt.decode(token, config.get("jwtPrivateKey"));
  it("should be valid token", () => {
    expect(decoded).toMatchObject({
      role: "admin"
    });
  });
});