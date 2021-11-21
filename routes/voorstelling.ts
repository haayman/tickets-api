import winston from "winston";
import auth from "../middleware/auth";
import express from "express";
import { Prijs, Uitvoering, Voorstelling } from "../models";
import { getRepository } from "../models/Repository";
import parseQuery from "./helpers/parseQuery";
import { QueryOrder, wrap } from "@mikro-orm/core";

const router = express.Router();

router.get("/", async (req, res) => {
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstellingen = await repository.findAll({
    populate: ["uitvoeringen", "prijzen"],
  });
  // let query = Voorstelling.query().allowGraph('[uitvoeringen,prijzen]');
  // query = parseQuery(query, req.query);

  // let voorstellingen = await query;
  // // const json = await Promise.all(voorstellingen.map(async v => v.toJSONA(res)));
  res.send(voorstellingen);
});

router.get("/:id", async (req, res) => {
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstelling = await repository.findOne(+req.params.id, {
    populate: ["uitvoeringen", "prijzen"],
  });
  if (!voorstelling) {
    return res.status(404).send("niet gevonden");
  } else {
    res.send(voorstelling);
  }
});

router.post("/", auth(["admin"]), async (req, res) => {
  try {
    delete req.body.id; // verwijder id=null
    const repository = getRepository<Voorstelling>("Voorstelling");
    const voorstelling = repository.create(req.body);
    wrap(voorstelling).assign(req.body, { mergeObjects: true });
    await repository.persistAndFlush(voorstelling);
    res.send(voorstelling);
  } catch (e) {
    // winston.error(e.message, e);
    res.status(400).send(e.message);
  }
});

router.put("/:id", auth(["admin"]), async (req, res) => {
  const voorstellingRepository = getRepository<Voorstelling>("Voorstelling");
  const prijzenRepository = getRepository<Prijs>("Prijs");
  const uitvoeringRepository = getRepository<Uitvoering>("Uitvoering");
  let id = +req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  let voorstelling = await voorstellingRepository.findOne(id, [
    "prijzen",
    "uitvoeringen",
  ]);
  if (!voorstelling) {
    return res.status(404).send(`not found: ${id}`);
  }

  voorstelling.updateNestedEntities(voorstelling.prijzen, req.body.prijzen);
  voorstelling.updateNestedEntities(
    voorstelling.uitvoeringen,
    req.body.uitvoeringen
  );

  wrap(voorstelling).assign(req.body, { updateNestedEntities: false });

  await voorstellingRepository.persistAndFlush(voorstelling);

  res.send(voorstelling);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstelling = await repository.findOne(+req.params.id);
  if (!voorstelling) {
    return res.status(404).send("niet gevonden");
  }
  await repository.removeAndFlush(voorstelling);

  res.send({ status: "OK" });
});

export default router;
