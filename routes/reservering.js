const winston = require("winston");
const auth = require("../middleware/auth");
const express = require("express");
const { Reservering, Prijs, Payment, Uitvoering } = require("../models");
const TicketAggregate = require("../models/Ticket.Aggregate");

const router = express.Router();

router.get("/", auth(["admin", "speler", "kassa"]), async (req, res) => {
  let reserveringen = await Reservering.findAll({
    include: { all: true, nested: true }
  });
  res.send(reserveringen);
});

router.post("/", async (req, res) => {
  Reservering.sequelize.transaction(async transaction => {
    let reservering = await Reservering.create(req.body, {
      transaction
    });
    reservering.uitvoering = await Uitvoering.findById(
      reservering.uitvoeringId
    );
    await Promise.all(
      req.body.tickets.map(async t => {
        const prijs = await Prijs.findById(t.prijs.id);
        const tickets = new TicketAggregate(reservering, prijs, transaction);
        tickets.setAantal(t.aantal);
      })
    );

    reservering.wachtlijst = await reservering.moetInWachtrij;
    await reservering.save({ transaction });

    if (!reservering.wachtlijst) {
      const payment = await Payment.create({ reservering }, { transaction });
    } else {
      ReserveringMail.send(reservering, "wachtlijst");
    }

    res.send(reservering);
  });
});

router.put("/:id", async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  const reservering = await Reservering.findByIdAndUpdate(id, req.body, {
    new: true
  });
  if (!reservering) {
    return res.status(404).send(`not found: ${id}`);
  }
  res.send(reservering);
});

router.get("/:id", async (req, res) => {
  const reservering = await Reservering.findById(req.params.id, {
    include: { all: true, nested: true }
  });
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    res.send(reservering);
  }
});

router.get("/:id/paymentUrl", async (req, res) => {
  const reservering = await Reservering.findById(req.params.id).populate(
    "payment"
  );
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    res.send({ paymentUrl: reservering.paymentUrl });
  }
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const reservering = await reservering.findByIdAndDelete(req.params.id);
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }

  res.send(reservering);
});

module.exports = router;
