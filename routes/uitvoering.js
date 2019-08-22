const express = require("express");
const {
  Uitvoering
} = require("../models");
const parseQuery = require('./helpers/parseQuery');

const router = express.Router();

router.get("/", async (req, res) => {
  const params = parseQuery(Uitvoering, req.query)
    let uitvoeringen = await Uitvoering.findAll(params);
  const json = await Promise.all(uitvoeringen.sort((a,b)=>a.aanvang-b.aanvang).map(async v => v.toJSONA()));
  res.send(json);
});

router.get("/:id", async (req, res) => {
  const params = parseQuery(Uitvoering, req.query)
  const uitvoering = await Uitvoering.findByPk(req.params.id, params);
  if (!uitvoering) {
    return res.status(404).send("niet gevonden");
  }
  const json = await uitvoering.toJSONA();
  res.send(json);
});

module.exports = router;
