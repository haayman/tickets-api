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
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "kassa",
      name: "Kassa",
      email: "kassa@plusleo.nl",
      password: "dit is de kassa",
      role: "kassa"
    });
    models.User.create({
      username: "jack",
      name: "Jack",
      email: "jack@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "lexp",
      name: "Lex Prinzen",
      email: "lexp@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "rana",
      name: "Rana",
      email: "rana@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "garmene",
      name: "Garmène",
      email: "garmene@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "gerida",
      name: "Gerida",
      email: "gerida@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "selena",
      name: "selena",
      email: "selena@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    models.User.create({
      username: "hasse",
      name: "Hasse",
      email: "hasse@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
  } catch (e) {
    console.log(e);
  }
})();

function makePassword(length) {
  var text = "";
  var char_list =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += char_list.charAt(Math.floor(Math.random() * char_list.length));
  }
  return text;
}
