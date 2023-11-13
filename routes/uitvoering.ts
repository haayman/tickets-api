import { Uitvoering } from "../models";
import { getRepository } from "../models/Repository";
import { QueryOrder } from "@mikro-orm/core";
import { parseQuery } from "./helpers/parseQuery";
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const repository = getRepository<Uitvoering>("Uitvoering");
  let params = req.query;
  params.orderBy = { aanvang: QueryOrder.ASC };
  const query = parseQuery<Uitvoering>(["voorstelling"], params);

  const uitvoeringen = await repository.findAll(query);
  res.send(uitvoeringen);
});

router.get("/:id", async (req, res) => {
  const repository = getRepository<Uitvoering>("Uitvoering");
  const uitvoering = await repository.findOneOrFail(+req.params.id);
  res.send(uitvoering);
});

export default router;
