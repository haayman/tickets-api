import { getRepository } from "../models/Repository";
import express from "express";
import auth from "../middleware/auth";
import { Log } from "../models";
import { parseQuery } from "./helpers/parseQuery";
import { LoadStrategy } from "@mikro-orm/core";

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const repository = getRepository<Log>("Log");
  let params = req.query;
  params.order = "-created_at";
  const query = parseQuery<Log>(["reservering"], params);
  query.strategy = LoadStrategy.JOINED;
  const logs: Log[] = await repository.findAll(query);
  res.send(logs);
});

export default router;
