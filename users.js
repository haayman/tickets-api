const mongoose = require("mongoose");
const config = require("config");

mongoose.pluralize(null);

const { User } = require("./models/User");

mongoose
  .connect(
    config.get("database.connection"),
    { useNewUrlParser: true }
  )
  .then(async () => {
    console.log("connected");
    try {
      let users = await User.find().populate("roleId");
      console.log(users);

      mongoose.disconnect();
    } catch (e) {
      console.error("Kon rol niet opslaan", e);
      mongoose.disconnect();
    }
  })
  .catch(e => {
    console.error("Error", e);
    mongoose.disconnect();
  });
