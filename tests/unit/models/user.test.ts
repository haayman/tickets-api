// process.env.NODE_CONFIG_DIR = "../../../config";

import { User } from "../../../models/User";
import jwt from "jsonwebtoken";
import config from "config";
import faker from "community-faker";

describe("getAuthToken", () => {
  it("should be valid token", () => {
    const user = User.fromJson({
      username: faker.internet.userName(),
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      role: "admin",
    });
    let token = user.getAuthToken();
    let decoded = jwt.decode(token, config.get("jwtPrivateKey"));
    expect(decoded).toMatchObject({
      role: "admin",
    });
  });
});
