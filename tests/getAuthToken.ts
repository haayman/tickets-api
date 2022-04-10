import { IRole, User } from "../models/User";

export default function (role: IRole = "admin") {
  try {
    let user = User.fromJson({
      username: "username",
      name: "name",
      password: "password",
      email: "email@test.com",
      role,
    });
    const authToken = user.getAuthToken();
    return `Bearer ${authToken}`;
  } catch (ex) {
    console.log(ex);
    throw ex;
  }
}
