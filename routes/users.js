const auth = require("../middleware/auth");
const express = require("express");
const User = require('../models/User');
const Mailer = require("../components/Mailer");

const router = express.Router();

router.get("/", auth(["admin"]), async (req, res) => {
  let users = await User.query().orderBy('username')
  res.send(users.map(u => u.$omit('password')));
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    let user = await User.query().findOne({
      name: req.body.name
    });
    if (user) {
      return res.status(400).send(`Gebruiker ${user.name} al geregistreerd`);
    }

    user = await User.query().insert(req.body);
    res.header("x-auth-token", user.getAuthToken()).send(user);
  } catch (e) {
    // console.error(e);
    res.status(400).send(e);
  }
});

router.put("/:id", async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  let user = await User.query().findById(id);
  if (!user) {
    return res.status(404).send(`not found: ${id}`);
  }

  // if (!res.locals.user) {
  //   // not logged in
  //   const hash = req.query.hash;
  //   if (!hash) {
  //     return res.status(403).send("no hash");
  //   } else if (hash != user.getHash()) {
  //     return res.status(403).send("invalid hash");
  //   }
  // }

  user = await User.query().patchAndFetchById(id, req.body);

  res.send(user);
});

router.get("/:id", async (req, res) => {
  const user = await User.query().findById(req.params.id);
  if (!user) {
    return res.status(404).send("niet gevonden");
  }
  // if (!res.locals.user) {
  //   // not logged in
  //   const hash = req.query.hash;
  //   if (!hash) {
  //     return res.status(403).send("no hash");
  //   } else if (hash != user.getHash()) {
  //     return res.status(403).send("invalid hash");
  //   }
  // }
  res.send(user.$omit('password'));
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const user = await User.query().findById(req.params.id);
  if (!user) {
    return res.status(404).send("niet gevonden");
  }
  await User.query().deleteById(user.id);

  res.send(user);
});

router.post("/forgotten", async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(403).send("geen username");
  }
  const user = await User.query().findOne({
    username: username
  });
  if (!user) {
    return res.status(404).send("niet gevonden");
  }

  const mailer = new Mailer();
  mailer
    .setTemplate("password_forgotten")
    .setSubject("Wachtwoord vergeten")
    .setTo(user.email, user.naam);

  await mailer.send({
    user: user
  });
  return res.send("mail verstuurd");
});

module.exports = router;
