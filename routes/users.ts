import auth from "../middleware/auth";
import express from "express";
import { User } from "../models/User";
import { Mailer } from "../components/Mailer";
import { getRepository } from "../models/Repository";
import { QueryOrder, wrap } from "@mikro-orm/core";

const router = express.Router();

router.get("/", auth(["admin"]), async (req, res) => {
  const userRepository = getRepository<User>("User");
  let users = await userRepository.findAll({
    orderBy: { username: QueryOrder.ASC },
  });
  res.send(users);
});

router.post("/", auth(["admin"]), async (req, res) => {
  const userRepository = getRepository<User>("User");
  try {
    let user = await userRepository.findOne({
      username: req.body.username,
    });
    if (user) {
      return res
        .status(400)
        .send(`Gebruiker ${user.username} al geregistreerd`);
    }

    user = userRepository.create(req.body);
    await userRepository.persistAndFlush(user);
    res.json(user);
  } catch (e) {
    // console.error(e);
    res.status(400).send(e);
  }
});

router.put("/:id", async (req, res) => {
  const userRepository = getRepository<User>("User");
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  let user = await userRepository.findOne(id);
  if (!user) {
    return res.status(404).send(`not found: ${id}`);
  }

  if (!res.locals.user) {
    // not logged in
    const hash = req.query.hash;
    if (!hash) {
      return res.status(403).send("no hash");
    } else if (hash != user.getHash()) {
      return res.status(403).send("invalid hash");
    }
  }

  wrap(user).assign(req.body);
  await userRepository.persistAndFlush(user);

  res.send(user);
});

router.get("/:id", async (req, res) => {
  const userRepository = getRepository<User>("User");
  let me = res.locals.user;
  const user = await userRepository.findOne({ id: req.params.id });

  if (!res.locals.user) {
    // not logged in
    const hash = req.query.hash;
    if (!hash) {
      return res.status(403).send("no hash");
    } else if (hash != user.getHash()) {
      return res.status(403).send("invalid hash");
    }
    me = user;
  }

  if (!(me?.isAdministrator() || me?.id === req.params.id)) {
    return res.status(403).send("Access denied");
  }

  if (!user) {
    return res.status(404).send("niet gevonden");
  }

  res.json(user);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const userRepository = getRepository<User>("User");
  const user = await userRepository.findOne(req.params.id);
  if (!user) {
    return res.status(404).send("niet gevonden");
  }
  await userRepository.removeAndFlush(user);

  res.send({ status: "OK" });
});

router.post("/forgotten", async (req, res) => {
  const userRepository = getRepository<User>("User");
  const username = req.body.username;
  if (!username) {
    return res.status(403).send("geen username");
  }
  const user = await userRepository.findOne({
    username: username,
  });
  if (!user) {
    return res.status(404).send("niet gevonden");
  }

  const mailer = new Mailer();
  mailer
    .setTemplate("password_forgotten")
    .setSubject("Wachtwoord vergeten")
    .setTo(user.email, user.name);

  await mailer.send({
    user: user,
  });
  return res.send("mail verstuurd");
});

export default router;
