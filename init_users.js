const models = require("./models");
(async () => {
  await models.User.destroy({ where: {}, truncate: true });
  try {
    models.User.create({
      username: "arjen",
      name: "Arjen",
      email: "arjen@plusleo.nl",
      password: "K03kk03k!",
      role: "admin"
    });

    models.User.create({
      username: "lex",
      name: "Lex",
      email: "lex@plusleo.nl",
      password: "dit is Lex",
      role: "speler"
    });
    models.User.create({
      username: "kassa",
      name: "Kassa",
      email: "kassa@plusleo.nl",
      password: "dit is de kassa",
      role: "kassa"
    });
  } catch (e) {
    console.log(e);
  }
})();
