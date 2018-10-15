const _ = require("lodash");
const auth = require("../middleware/auth");
const express = require("express");
const { User } = require("../models");
const Mailer = require("../components/Mailer");
const setUser = require("../middleware/user");

const router = express.Router();

router.get("/", auth(["admin"]), async (req, res) => {
  let users = await User.findAll({ order: ["username"] });
  res.send(users);
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    let user = await User.findOne({ where: { name: req.body.name } });
    if (user) {
      return res.status(400).send(`Gebruiker ${user.name} al geregistreerd`);
    }

    user = await User.create(req.body);
    res.header("x-auth-token", user.getAuthToken()).send(user);
  } catch (e) {
    // console.error(e);
    res.status(400).send(e.message);
  }
});

router.put("/:id", setUser, async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).send(`not found: ${id}`);
  }

  if (!req.user) {
    // not logged in
    const hash = req.query.hash;
    if (!hash) {
      return res.status(403).send("no hash");
    } else if (hash != user.getHash()) {
      return res.status(403).send("invalid hash");
    }
  }

  await user.update(req.body, {
    returning: true
  });

  res.send(user);
});

router.get("/:id", setUser, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).send("niet gevonden");
  }
  if (!req.user) {
    // not logged in
    const hash = req.query.hash;
    if (!hash) {
      return res.status(403).send("no hash");
    } else if (hash != user.getHash()) {
      return res.status(403).send("invalid hash");
    }
  }
  res.send(user);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).send("niet gevonden");
  }
  await user.destroy();

  res.send(user);
});

router.post("/forgotten", async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(403).send("geen username");
  }
  const user = await User.findOne({ where: { username: username } });
  if (!user) {
    return res.status(404).send("niet gevonden");
  }

  const mailer = new Mailer();
  mailer
    .setTemplate("password_forgotten.html")
    .setSubject("Wachtwoord vergeten")
    .setTo(user.email, user.naam);

  await mailer.send({ user: user });
  return res.send("mail verstuurd");
});

module.exports = router;
