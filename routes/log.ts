import { getRepository } from "../models/Repository";
import express from "express";
import auth from "../middleware/auth";
import { Log } from "../models";

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const repository = getRepository<Log>("Log");

  const logs: Log[] = await repository.findAll({
    orderBy: { created_at: "desc" },
  });
  res.send(logs);
});

export default router;
