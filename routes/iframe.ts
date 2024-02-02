"use strict";
import express from "express";
import { Voorstelling } from "../models";
import format from "date-fns/format";
import nl from "date-fns/locale/nl";
import aejs from "async-ejs";
import path from "path";
import process from "process";
import { getRepository } from "../models/Repository";

const router = express.Router();

router.get("/", async (req, res) => {
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstellingen = await repository.findAll({
    populate: ["uitvoeringen", "prijzen"],
  });

  try {
    const voorstellingId = req.query.id;
    if (voorstellingId) {
      const voorstelling = voorstellingen.find((v) => v.id === +voorstellingId);
      if (voorstelling) {
        return aejs.renderFile(
          __dirname + "/templates/iframe.ejs",
          {
            voorstelling,
            format,
            nl,
            env: process.env,
          },
          (error, result) => {
            res.send(result);
          }
        );
      }
    } else if (voorstellingen.length === 1) {
      const voorstelling = voorstellingen[0];

      aejs.renderFile(
        __dirname + "/templates/iframe.ejs",
        {
          voorstelling,
          format,
          nl,
          env: process.env,
        },
        (error, result) => {
          res.send(result);
        }
      );
    } else {
      aejs.renderFile(
        __dirname + "/templates/iframe-list.ejs",
        {
          voorstellingen,
          format,
          nl,
          env: process.env,
        },
        (error, result) => {
          res.send(result);
        }
      );
    }
  } catch (e) {
    return "Er gaat iets fout";
  }
});

export default router;
