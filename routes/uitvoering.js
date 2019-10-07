const express = require("express");
const {
  Uitvoering
} = require("../models");
const parseQuery = require('./helpers/parseQuery')

const router = express.Router();

router.get("/", async (req, res) => {
  let query = Uitvoering.query();
  query = parseQuery(query, req.query).allowEager('voorstelling');;
  let uitvoeringen = await query;
  uitvoeringen = uitvoeringen.sort((a, b) => a.aanvang - b.aanvang);
  // const json = await Promise.all(uitvoeringen.sort((a,b)=>a.aanvang-b.aanvang).map(async v => v.toJSONA()));
  res.send(uitvoeringen);
});

router.get("/:id", async (req, res) => {
  let query = Uitvoering.query().allowEager('voorstelling');;
  query = parseQuery(query, req.query);
  const uitvoering = await query.findById(req.params.id);
  if (!uitvoering) {
    return res.status(404).send("niet gevonden");
  }
  // const json = await uitvoering.toJSONA();
  res.send(uitvoering);
});

module.exports = router;
