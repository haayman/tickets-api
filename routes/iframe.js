"use strict";
const express = require("express");
const {
  Voorstelling
} = require("../models");
const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const aejs = require('async-ejs');
const path = require('path');

const router = express.Router();

router.get("/", async (req, res) => {
  const voorstellingen = await Voorstelling.findAll({
    include: [{
        association: Voorstelling.Prijzen
      },
      {
        association: Voorstelling.Uitvoeringen
      }
    ]
  });
  const voorstelling = voorstellingen[0];
  await Promise.all(voorstelling.uitvoeringen.map(async (uitvoering) => {
    uitvoering.Status = await uitvoering.status();
  }));

  aejs.renderFile(__dirname + '/templates/iframe.ejs', {
    voorstelling,
    format,
    nl
  }, (error, result) => {
    res.send(result);
  });
});


module.exports = router;