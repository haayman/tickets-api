import auth from "../middleware/auth";
import express from "express";
import { Prijs, Uitvoering, Voorstelling, Reservering } from "../models";
import { getRepository } from "../models/Repository";
import { FilterQuery, wrap, RequestContext } from "@mikro-orm/core";
import { paymentNeeded } from "../handlers/paymentNeeded";
import { TicketHandler } from "../helpers/TicketHandler";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";
import { parseQuery } from "./helpers/parseReserveringQuery";
import Container from "typedi";
import { Queue } from "bullmq";

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");
  const options = parseQuery<Reservering>(Reservering.populate(), req.query);
  const where: FilterQuery<Reservering> = {};
  if (req.query.uitvoering_id) {
    where.uitvoering = { id: +req.query.uitvoering_id };
  }

  let reserveringen = await repository.find(where, options);

  res.json(reserveringen);
});

router.get("/:id", async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");
  const options = parseQuery<Reservering>(Reservering.populate(), req.query);

  const reservering = await repository.findOne({ id: req.params.id }, options);
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }

  await reservering.finishLoading();
  await paymentNeeded(reservering);

  res.json(reservering.toJSON());
});

router.post("/", async (req, res) => {
  const em = RequestContext.getEntityManager().fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    // verwijder tickets uit de body, die worden door ticketHandler.update verwerkt
    let { tickets, ...data } = req.body;
    let reservering = repository.create(data);
    em.persist(reservering);

    await repository.populate(reservering, Reservering.populate());
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update(tickets, res.locals?.user?.role);

    reservering.wachtlijst = await reservering.moetInWachtrij(em, false);
    await paymentNeeded(reservering);
    await reservering.finishLoading();

    await em.commit();

    let queue: Queue = Container.get("reserveringCreatedQueue");
    await queue.add("reserveringCreated", reservering.id);

    res.send(reservering);
  } catch (e) {
    winston.error(e);
    em.rollback();
    throw e;
  }
});

router.put("/:id", async (req, res) => {
  const em = RequestContext.getEntityManager().fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    // verwijder tickets uit de body, die worden door ticketHandler.update verwerkt
    let { tickets, ...data } = req.body;
    let reservering = await repository.findOneOrFail({ id: req.params.id });

    if (reservering.ingenomen) {
      await em.rollback();
      return res.status(405).send("reservering is al ingenomen");
    }

    wrap(reservering).assign(data);
    await repository.populate(reservering, Reservering.populate());
    await reservering.finishLoading();
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update(tickets, res.locals?.user?.role);

    reservering.wachtlijst = await reservering.moetInWachtrij(em, true);

    await paymentNeeded(reservering);

    await em.commit();

    let queue: Queue = Container.get("reserveringUpdatedQueue");
    await queue.add("reserveringUpdated", reservering.id);

    queue = Container.get("verwerkWachtlijstQueue");
    await queue.add("verwerkWachtlijst", reservering.uitvoering.id);

    res.send(reservering);
  } catch (e) {
    winston.error(e);

    await em.rollback();
    throw e;
  }
});

router.delete("/:id", async (req, res) => {
  const em = RequestContext.getEntityManager().fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    let reservering = await repository.findOneOrFail({ id: req.params.id });
    if (reservering.ingenomen) {
      await em.rollback();
      return res.status(405).send("reservering is al ingenomen");
    }

    await repository.populate(reservering, Reservering.populate());
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update([]);

    await em.commit();

    let queue: Queue = Container.get("reserveringDeletedQueue");
    await queue.add("reserveringDeleted", reservering.id);

    queue = Container.get("verwerkWachtlijstQueue");
    await queue.add("verwerkWachtlijst", reservering.uitvoering.id);

    res.send(reservering);
  } catch (e) {
    winston.error(e);

    await em.rollback();
    throw e;
  }
});

router.put("/:id/ingenomen", auth(["kassa"]), async (req, res) => {
  const em = RequestContext.getEntityManager().fork();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    let reservering = await repository.findOneOrFail({ id: req.params.id });
    if (reservering.ingenomen) {
      return res.status(405).send("reservering is al ingenomen");
    }
    reservering.ingenomen = new Date();

    await em.commit();

    res.send(reservering);
  } catch (e) {
    winston.error(e);

    await em.rollback();
    throw e;
  }
});

router.get("/:id/resend", async (req, res) => {
  const em = RequestContext.getEntityManager();
  const repository = em.getRepository<Reservering>("Reservering");

  let reservering = await repository.findOne(
    { id: req.params.id },
    Reservering.populate()
  );

  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    await reservering.finishLoading();
    const saldo = reservering.saldo;

    if (saldo >= 0) {
      ReserveringMail.send(
        reservering,
        "ticket",
        `Kaarten voor ${reservering}`
      );
    } else {
      ReserveringMail.send(
        reservering,
        "paymentFailure",
        "Betalingsherinnering"
      );
    }
    res.send("OK");
  }
});

router.post("/:id/newPayment", async (req, res) => {
  const em = RequestContext.getEntityManager();
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    let reservering = await repository.findOneOrFail(
      { id: req.params.id },
      Reservering.populate()
    );

    await reservering.finishLoading();
    await paymentNeeded(reservering);

    await em.commit();

    const paymentUrl = reservering.paymentUrl;
    if (paymentUrl) {
      res.send({
        paymentUrl,
      });
    } else {
      res.send({});
    }
  } catch (e) {
    await em.rollback();
    throw e;
  }
});

router.get("/:id/mail", async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");

  const reservering = await repository.findOneOrFail(
    { id: req.params.id },
    Reservering.populate()
  );
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }
  await reservering.finishLoading();

  const html = await ReserveringMail.render(
    reservering,
    req.query.template || "ticket",
    req.query
  );
  res.send(html);
});

router.get("/:id/qr", async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");

  const reservering = await repository.findOne({ id: req.params.id });
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }

  const qr = require("qr-image");

  const png = qr.imageSync(reservering.getTicketUrl(), {
    type: "png",
    size: 5,
    margin: 3,
  });
  res.type("png").send(png);
});

export default router;
