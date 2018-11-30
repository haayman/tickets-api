const express = require("express");
const auth = require('../middleware/auth');
const {
  Log
} = require("../models");
const parseQuery = require('./helpers/parseQuery');

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const params = parseQuery(Log, req.query)
  params.order = [
    ['id', 'desc']
  ];
  const logs = await Log.findAll(params);
  res.send(logs);
});

module.exports = router;