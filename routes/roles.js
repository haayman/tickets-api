const _ = require("lodash");
const Joi = require("joi");
const express = require("express");
const { Role, validate } = require("../models/Role");

const router = express.Router();

router.get("/", async (req, res) => {
  // try {
  let roles = await Role.find();
  res.send(roles);
  // } catch (e) {
  //   res.status(500).send("Fout", e);
  // }
});

router.post("/", async (req, res) => {
  try {
    if (!({ error } = validate(req.body))) {
      console.log(error);
      return res
        .status(400)
        .send(error.details.map(d => d.message).join(" and "));
    }

    let role = await Role.findOne({ name: req.body.name });
    if (role) {
      return res.status(400).send(`${role.name} bestaat al`);
    }

    role = new Role(req.body);
    role = await role.save();
    res.send(role);
  } catch (e) {
    console.error(e);
    res.status(400).send(e.message);
  }
});

router.put("/:id", async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  if (!({ error } = validate(req.body))) {
    return res
      .status(400)
      .send(error.details.map(d => d.message).join(" and "));
  }

  const role = await Role.findByIdAndUpdate(id, req.body);
  if (!role) {
    return res.status(404).send(`not found: ${id}`);
  }
  res.send(role);
});

router.get("/:id", async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) {
    return res.status(404).send("niet gevonden");
  } else {
    res.send(role);
  }
});

router.delete("/:id", async (req, res) => {
  const role = await Role.findByIdAndDelete(req.params.id);
  if (!role) {
    return res.status(404).send("niet gevonden");
  }

  res.send(role);
});

module.exports = router;
