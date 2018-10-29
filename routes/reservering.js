"use strict";
const auth = require("../middleware/auth");
const express = require("express");
const {
  Reservering,
  Prijs,
  Uitvoering
} = require("../models");
const TicketAggregate = require("../models/Ticket.Aggregate");
const ReserveringMail = require("../components/ReserveringMail");
const _parseQuery = require('./helpers/parseQuery');

const router = express.Router();

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) === index;
}

const parseQuery = function (model, params) {
  if (params.include && params.include.includes('tickets')) {

    params.include = params.include.filter((i) => i !== 'tickets').concat([
      'Uitvoering.Voorstelling.Prijzen',
      'Tickets',
      'Payments'
    ]).filter(onlyUnique);
    model.addHook('afterFind', model.initTickets);
  }
  return _parseQuery(model, params);
}

router.get("/", auth(["admin", "speler", "kassa"]), async (req, res) => {
  const params = parseQuery(Reservering, req.query);
  if (req.query.uitvoeringId) {
    params.where = {
      uitvoeringId: req.query.uitvoeringId
    }
  }

  let reserveringen = await Reservering.findAll(params);
  Reservering.removeHook('afterFind');

  const json = await Promise.all(reserveringen.map(async r => r.toJSONA()));

  res.send(json);
});

router.post("/", async (req, res) => {
  Reservering.sequelize.transaction(async transaction => {
    let reservering = await Reservering.create(req.body);
    reservering.uitvoering = await Uitvoering.findById(
      reservering.uitvoeringId
    );
    reservering.tickets = [];
    await Promise.all(
      req.body.tickets.map(async t => {
        const prijs = await Prijs.findById(t.prijs.id);
        const ta = new TicketAggregate(reservering, prijs);
        await ta.setAantal(t.aantal);
        reservering.tickets.push(ta);
      })
    );

    reservering.wachtlijst = await reservering.moetInWachtrij;

    await reservering.createPaymentIfNeeded();
    await reservering.save();

    Reservering.verwerkRefunds();

    if (reservering.wachtlijst) {
      //   const payment = Payment.build({});
      //   await payment.setReservering(reservering);
      //   payment.save({ transaction });
      // } else {
      ReserveringMail.send(
        reservering,
        "wachtlijst",
        "Je staat op de wachtlijst"
      );
    }

    res.send(reservering);
  });
});

router.put("/:id", async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  const params = parseQuery(Reservering, {
    include: ['tickets', 'Payments']
  })
  const reservering = await Reservering.findById(id, params);
  if (!reservering) {
    return res.status(404).send(`not found: ${id}`);
  }

  Reservering.sequelize.transaction(async transaction => {
    await reservering.update(req.body);

    reservering.uitvoering = await Uitvoering.findById(
      reservering.uitvoeringId
    );
    await Promise.all(
      req.body.tickets.map(async t => {
        // const prijs = await Prijs.findById(t.prijs.id);
        // const ta = new TicketAggregate(reservering, prijs);
        const ta = reservering.tickets.find((ticket) => ticket.prijs.id == t.prijs.id);
        await ta.setAantal(t.aantal);
        // reservering.tickets.push(ta);
      })
    );

    reservering.wachtlijst = await reservering.moetInWachtrij;

    await reservering.reload({
      include: [{
        all: true,
        nested: true
      }]
    })
    Reservering.removeHook('afterFind');

    const saldo = reservering.saldo;
    if (saldo < 0) {
      // if (!reservering.wachtlijst) {
      //   await reservering.extraBetaling();
      // }
      await reservering.createPaymentIfNeeded();
    } else {
      if (saldo > 0 && reservering.teruggeefbaar()) {
        await reservering.refund();
      }
      ReserveringMail.send(reservering, "gewijzigd", 'reservering gewijzigd');
    }

    await reservering.uitvoering.verwerkWachtlijst();
    await Reservering.verwerkRefunds();

    res.send(reservering);
  });
});

router.get("/:id", async (req, res) => {
  const params = parseQuery(Reservering, req.query);

  const reservering = await Reservering.findById(req.params.id, params);
  Reservering.removeHook('afterFind');
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    const json = await reservering.toJSONA();
    res.send(json);
  }
});

router.get("/:id/resend", async (req, res) => {
  const reservering = await Reservering.findById(req.params.id);
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    const isPaid = await reservering.isPaid;
    if (isPaid) {
      ReserveringMail.send(
        reservering,
        "confirmationPayment",
        `ticket ${reservering}`
      );
    } else {
      ReserveringMail.send(reservering, "paymentFailure", "Betaling mislukt");
    }
    res.send('OK');
  }
});

router.post("/:id/terugbetaling", async (req, res) => {
  if (!reservering) return res.status(404).send("niet gevonden");


})

router.get("/:id/mail", async (req, res) => {
  const params = parseQuery(req);
  const reservering = await Reservering.findById(req.params.id, params);
  Reservering.removeHook('afterFind');
  if (!reservering) return res.status(404).send("niet gevonden");
  const html = await ReserveringMail.render(
    reservering,
    req.query.template,
    req.query
  );
  res.send(html);
});

router.get('/:id/qr', async (req, res) => {
  const reservering = await Reservering.findById(req.params.id);
  if (!reservering) return res.status(404).send("niet gevonden");

  const qr = require('qr-image');

  const png = qr.imageSync(reservering.getTicketUrl(), {
    type: 'png',
    size: 5,
    margin: 3
  });
  res.type('png').send(png);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const reservering = await Reservering.findById(req.params.id);
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  }
  await reservering.destroy();

  res.send(reservering);
});

module.exports = router;