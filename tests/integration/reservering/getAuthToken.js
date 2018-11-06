const {
  User
} = require("../../../models/");

module.exports = async function (role = "admin") {
  const user = await User.create({
    username: "administrator",
    name: "Admin",
    password: "my name is admin",
    email: "admin@plusleo.nl",
    role: role
  });
  authToken = user.getAuthToken();
  await user.destroy();
  return authToken;
}