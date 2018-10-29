const models = require("./models");

models.sequelize
  .sync({ force: true })
  .then(async () => {
    console.log("connected");
    try {
      const arjen = await models.User.bulkCreate(
        {
          username: "arjen",
          name: "Arjen",
          email: "arjen@plusleo.nl",
          password: "K03kk03k!",
          role: "admin"
        },
        {
          username: "lex",
          name: "Lex",
          email: "lex@plusleo.nl",
          password: "dit is Lex",
          role: "speler"
        },
        {
          username: "kassa",
          name: "Kassa",
          email: "kassa@plusleo.nl",
          password: "dit is de kassa",
          role: "kassa"
        }
      );
    } catch (e) {
      console.error("Kon rol niet opslaan", e);
    }
  })
  .catch(e => {
    console.error("Error", e);
  });
