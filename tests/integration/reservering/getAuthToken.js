const {
  User
} = require("../../../models/");

module.exports = async function (role = "admin") {
  try {
    let user = await User.query().where('role', '=', role).first();
    if (!user) {
      user = await User.query().insert({
        username: "administrator",
        name: "Admin",
        password: "my name is admin",
        email: "admin@plusleo.nl",
        role: role
      });
    }
    authToken = user.getAuthToken();
    // await user.$query().delete();
    return authToken;
  } catch (ex) {
    console.log(ex);
    throw (ex)
  }
}
