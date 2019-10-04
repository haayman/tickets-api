const express = require("express");
const auth = require('../middleware/auth');
const {
  Log
} = require("../models");
const parseQuery = require('./helpers/parseQuery');

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  let params = req.query;

  const query = parseQuery(Log.query().allowEager('[reservering]'), params)
  const logs = await query.orderBy('id', 'desc');
  res.send(logs.results);
});

module.exports = router;
