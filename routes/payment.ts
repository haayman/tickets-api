import express from "express";
import winston from "winston";
import { RequestContext } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Reservering } from "../models";
import { queue } from "../startup/queue";
import { PaymentReceiveMessage } from "../handlers/paymentReceived";

const router = express.Router();

router.post("/bank/:id", async (req, res) => {
  winston.info(req.body);
  const id = req.params.id;
  const message: PaymentReceiveMessage = {
    reservering_id: id,
    payment_id: req.body.id,
  };
  // @ts-ignore
  queue.emit("paymentReceived", message);
  res.send("OK");
});

router.get("/done/:id", async (req: Request, res: Response) => {
  const em = RequestContext.getEntityManager();
  const repository = em.getRepository<Reservering>("Reservering");

  const reservering = await repository.findOne({
    reserveringId: req.params.id,
  });
  await reservering.finishLoading();
  const isPaid = reservering.openstaandBedrag <= 0;
  if (isPaid) {
    res.redirect(`/reserveren/${req.params.id}/done`);
  } else {
    res.redirect(`/reserveren/${req.params.id}/failed`);
  }
});

module.exports = router;
