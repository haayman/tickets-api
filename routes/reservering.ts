import auth from "../middleware/auth";
import express from "express";
import { Prijs, Uitvoering, Voorstelling, Reservering } from "../models";
import { getRepository } from "../models/Repository";
import { FilterQuery, wrap, RequestContext } from "@mikro-orm/core";
import { paymentNeeded } from "../handlers/paymentNeeded";
import { TicketHandler } from "../helpers/TicketHandler";
import { queue } from "../startup/queue";
import { ReserveringMail } from "../components/ReserveringMail";
import winston from "winston";

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");
  const where: FilterQuery<Reservering> = {};
  if (req.query.uitvoeringId) {
    where.uitvoering = { id: req.query.uitvoeringId };
  }

  let reserveringen = await repository.findAll(where);
  await repository.populate(reserveringen, [
    "uitvoering.voorstelling.prijzen",
    "tickets.payment",
    "tickets.prijs",
    "payments",
  ]);

  res.json(reserveringen);
});

router.get("/:id", async (req, res) => {
  const repository = getRepository<Reservering>("Reservering");

  const reservering = await repository.findOne(
    { id: req.params.id },
    {
      populate: Reservering.populate(),
    }
  );
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }

  await reservering.finishLoading();
  await paymentNeeded(reservering);

  res.json(reservering.toJSON());
});

router.post("/", async (req, res) => {
  const em = RequestContext.getEntityManager().fork(false);
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    // verwijder tickets uit de body, die worden door ticketHandler.update verwerkt
    let { tickets, ...data } = req.body;
    let reservering = repository.create(data);
    em.persist(reservering);

    await repository.populate(reservering, Reservering.populate());
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update(tickets);

    reservering.wachtlijst = await reservering.moetInWachtrij(em, false);
    await paymentNeeded(reservering);

    await em.commit();
    res.send(reservering);

    queue.emit("reserveringUpdated", reservering.id);
  } catch (e) {
    winston.error(e);
    em.rollback();
    throw e;
  }
});

router.put("/:id", async (req, res) => {
  const em = RequestContext.getEntityManager().fork(false);
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    // verwijder tickets uit de body, die worden door ticketHandler.update verwerkt
    let { tickets, ...data } = req.body;
    let reservering = await repository.findOneOrFail({ id: req.params.id });

    if (reservering.ingenomen) {
      return res.status(405).send("reservering is al ingenomen");
    }

    wrap(reservering).assign(data);
    await repository.populate(reservering, Reservering.populate());
    await reservering.finishLoading();
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update(tickets);

    reservering.wachtlijst = await reservering.moetInWachtrij(em, true);

    await paymentNeeded(reservering);

    await em.commit();

    queue.emit("reserveringUpdated", reservering.id);

    res.send(reservering);
  } catch (e) {
    winston.error(e);

    await em.rollback();
    throw e;
  }
});

router.delete("/:id", async (req, res) => {
  const em = RequestContext.getEntityManager().fork(false);
  await em.begin();
  try {
    const repository = em.getRepository<Reservering>("Reservering");

    let reservering = await repository.findOneOrFail({ id: req.params.id });
    if (reservering.ingenomen) {
      return res.status(405).send("reservering is al ingenomen");
    }

    await repository.populate(reservering, Reservering.populate());
    const ticketHandler = new TicketHandler(em, reservering);
    ticketHandler.update([]);

    queue.emit("reserveringDeleted", reservering.id);

    await em.commit();

    res.send(reservering);
  } catch (e) {
    winston.error(e);

    await em.rollback();
    throw e;
  }
});

router.put("/:id/ingenomen", async (req, res) => {
  const em = RequestContext.getEntityManager().fork(false);
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
  // const mixin = require("../models/Refund.mixin");
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

// router.post("/:id/terugbetaald", auth(["admin"]), async (req, res) => {
//   const params = parseQuery({
//     include: ["tickets"],
//   });
//   const reservering = await Reservering.findByPk(req.params.id, params);
//   if (!reservering) return res.status(404).send("niet gevonden");
//   const refund = new RefundHandler(reservering);

//   const bedrag = refund.nonRefundableAmount();
//   if (bedrag) {
//     const tickets = refund.terugtebetalenTickets();
//     await Promise.all(
//       tickets.map(async (ticket) => {
//         ticket.terugbetalen = false;
//         ticket.geannuleerd = true;
//         const payment = ticket.payment;
//         payment.paidBack = (payment.paidBack || 0) + ticket.prijs.prijs;
//         await payment.update({
//           paidBack: payment.paidBack,
//         });
//         await ticket.update({
//           terugbetalen: ticket.terugbetalen,
//           geannuleerd: ticket.geannuleerd,
//         });
//       })
//     );
//     await Log.addMessage(reservering, `€ ${bedrag.toFixed(2)} terugbetaald`);

//     await ReserveringMail.send(
//       reservering,
//       "terugbetaald",
//       `Openstaand bedrag € ${bedrag.toFixed(2)} terugbetaald`,
//       {
//         bedrag: bedrag,
//       }
//     );
//   }
//   res.send("OK");
// });

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

// // router.get('/:id/qr_teruggave', async (req, res) => {
// //   const mixin = require('../models/RefundHandler');
// //   Object.assign(Reservering.prototype, mixin);
// //   const params = parseQuery(Reservering, {
// //     include: ['tickets', 'Payments']
// //   });
// //   const reservering = await Reservering.findByPk(req.params.id, params);
// //   const getBic = require('bic-from-iban');
// //   if (!reservering) return res.status(404).send('niet gevonden');

// //   const qr = require('qr-image');
// //   // https://gathering.tweakers.net/forum/list_messages/1800141
// //   // https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
// //   const bedrag = await reservering.nonRefundableAmount();
// //   const IBAN = reservering.iban.replace(/\s/g, '');
// //   const BIC = getBic.getBIC(IBAN) || 'TRIONL2U';
// //   const content = `BCD
// // 001
// // 1
// // SCT
// // ${BIC}
// // ${reservering.tennamevan}
// // ${IBAN}
// // EUR${bedrag.toFixed(2)}
// // Terugstorting PlusLeo`;

// //   const png = qr.imageSync(content, {
// //     type: 'png',
// //     size: 5,
// //     margin: 3
// //   });
// //   res.type('png').send(png);
// // });

export default router;
