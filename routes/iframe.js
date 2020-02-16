'use strict';
const express = require('express');
const { Voorstelling } = require('../models');
const format = require('date-fns/format');
const nl = require('date-fns/locale/nl');
const aejs = require('async-ejs');
const path = require('path');
const process = require('process');

const router = express.Router();

router.get('/', async (req, res) => {
  const voorstellingen = await Voorstelling.query().withGraphFetched(
    '[prijzen,uitvoeringen]'
  );
  const voorstelling = voorstellingen[0];

  aejs.renderFile(
    __dirname + '/templates/iframe.ejs',
    {
      voorstelling,
      format,
      nl,
      env: process.env
    },
    (error, result) => {
      res.send(result);
    }
  );
});

module.exports = router;
