const Knex = require('knex');
const config = require('config');
const knex = Knex(config.get('database'));
const User = require("./models/User");
User.knex(knex);

(async () => {
  await User.query().delete();
  try {
    await User.query().insert({
      username: "arjen",
      name: "Arjen",
      email: "arjen@plusleo.nl",
      password: "K03kk03k!",
      role: "admin"
    });

    await User.query().insert({
      username: "lex",
      name: "Lex",
      email: "lex@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "kassa",
      name: "Kassa",
      email: "kassa@plusleo.nl",
      password: "dit is de kassa",
      role: "kassa"
    });
    await User.query().insert({
      username: "jack",
      name: "Jack",
      email: "jack@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "lexp",
      name: "Lex Prinzen",
      email: "lexp@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "garmene",
      name: "Garmène",
      email: "garmene@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "gerida",
      name: "Gerida",
      email: "gerida@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "selena",
      name: "selena",
      email: "selena@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "hasse",
      name: "Hasse",
      email: "hasse@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "san",
      name: "San",
      email: "san@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    await User.query().insert({
      username: "bram",
      name: "Bram",
      email: "bram@plusleo.nl",
      password: makePassword(20),
      role: "speler"
    });
    return;
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
