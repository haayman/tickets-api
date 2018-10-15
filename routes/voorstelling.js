const winston = require("winston");
const auth = require("../middleware/auth");
const express = require("express");
const { Voorstelling, Uitvoering, Prijs } = require("../models");

const router = express.Router();
const getDelta = require("./getDelta");

router.get("/", async (req, res) => {
  let params = {};
  if (req.query.all == undefined) {
    params.active = true;
  }
  let voorstellingen = await Voorstelling.findAll({
    where: params,
    include: [Voorstelling.Uitvoeringen, Voorstelling.Prijzen]
  });
  const json = await Promise.all(voorstellingen.map(async v => v.toJSONA()));
  res.send(json);
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    const voorstelling = await Voorstelling.create(req.body, {
      include: [
        { association: Voorstelling.Prijzen },
        { association: Voorstelling.Uitvoeringen }
      ]
    });
    res.send(voorstelling);
  } catch (e) {
    winston.error(e.message, e);
    res.status(400).send(e.message);
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  let voorstelling = await Voorstelling.findById(id, {
    include: [Voorstelling.Uitvoeringen, Voorstelling.Prijzen]
  });
  if (!voorstelling) {
    return res.status(404).send("not found");
  }

  await Voorstelling.updateIncludes(req.body, {
    include: [Voorstelling.Uitvoeringen, Voorstelling.Prijzen]
  });

  res.send(voorstelling);
});

router.get("/:id", async (req, res) => {
  const voorstelling = await Voorstelling.findById(req.params.id, {
    include: [Voorstelling.Uitvoeringen, Voorstelling.Prijzen]
  });
  if (!voorstelling) {
    return res.status(404).send("niet gevonden");
  } else {
    // const json = await voorstelling.toJSONA();
    res.send(voorstelling);
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const voorstelling = await Voorstelling.findByIdAndDelete(req.params.id);
  if (!voorstelling) {
    return res.status(404).send("niet gevonden");
  }

  res.send(voorstelling);
});

module.exports = router;
