import auth from "../middleware/auth";
import express from "express";
import { Prijs, Reservering, Uitvoering, Voorstelling } from "../models";
import { getRepository } from "../models/Repository";
import { wrap } from "@mikro-orm/core";
import Container from "typedi";
import { Queue } from "bullmq";
import { EntityManager } from "@mikro-orm/mysql";

const router = express.Router();

router.get("/", async (req, res) => {
  const filters = req.query?.all ? false : { active: true };
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstellingen = await repository.findAll({
    populate: ["uitvoeringen", "prijzen"],
    filters,
  });
  res.send(voorstellingen);
});

router.get("/:id", async (req, res) => {
  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstelling = await repository.findOne(
    { id: +req.params.id },
    {
      populate: ["uitvoeringen", "prijzen"],
      filters: false,
    }
  );
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
    // wrap(voorstelling).assign(req.body, { mergeObjects: true });
    console.log();
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

  let voorstelling = await voorstellingRepository.findOne(id, {
    populate: ["prijzen", "uitvoeringen"],
    filters: false,
  });
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

  const queue: Queue = Container.get("verwerkWachtlijstQueue");
  for (const uitvoering of voorstelling.uitvoeringen) {
    await queue.add("verwerkWachtlijst", uitvoering.id);
  }

  res.send(voorstelling);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const em = Container.get("em") as EntityManager;
  const connection = em.getConnection();

  const repository = getRepository<Voorstelling>("Voorstelling");
  const voorstelling = await em.findOne(
    Voorstelling,
    {
      id: +req.params.id,
    },
    { filters: false } // niet-actieve voorstellingen kunnen ook verwijderd worden
  );
  if (!voorstelling) {
    return res.status(404).send("niet gevonden");
  }

  await connection.execute(
    "delete from logs where reservering_id in (select id from reserveringen where uitvoering_id in (select id from uitvoeringen where voorstelling_id = ?))",
    [voorstelling.id]
  );
  await repository.removeAndFlush(voorstelling);
  await connection.execute("delete from logs where reservering_id IS NULL");
  await em.flush();

  res.send({ status: "OK" });
});

export default router;
