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
  try {
    const repository = getRepository<Voorstelling>("Voorstelling");
    const voorstellingen = await repository.findAll({
      populate: ["uitvoeringen", "prijzen"],
    });

    const voorstellingId = req.query.id;
    let voorstelling: Voorstelling | undefined;
    if (voorstellingId || voorstellingen.length === 1) {
      voorstelling = voorstellingId
        ? voorstellingen.find((v) => v.id === +voorstellingId)
        : voorstellingen[0];
    }

    if (voorstelling) {
      const uitvoeringen = Array.from(voorstelling.uitvoeringen);
      const displayWachtrij = uitvoeringen.some((u) => u.vrije_plaatsen <= 2);
      aejs.renderFile(
        __dirname + "/templates/iframe.ejs",
        {
          voorstelling,
          displayWachtrij,
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
  } catch (error) {
    console.error(error);
    res.status(500).send("Er is een fout opgetreden");
  }
});

export default router;
