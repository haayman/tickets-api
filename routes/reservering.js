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
const parseQuery = require("./helpers/parseReserveringQuery");

const router = express.Router();

router.get("/", auth(true), async (req, res) => {
  const params = parseQuery(Reservering, req.query);
  if (req.query.uitvoeringId) {
    params.where = {
      uitvoeringId: req.query.uitvoeringId
    };
  }

  let reserveringen = await Reservering.findAll(params);
  Reservering.removeHook("afterFind");

  const json = await Promise.all(reserveringen.map(async r => r.toJSONA(req.query)));

  res.send(json);
});

router.post("/", async (req, res) => {
  Reservering.sequelize.transaction(async transaction => {
    /** @var {Reservering} */
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

    reservering.wachtlijst = await reservering.moetInWachtrij();

    await reservering.createPaymentIfNeeded();
    await reservering.save();

    const saldo = reservering.saldo;
    const strReservering = await reservering.asString();
    if (!saldo) {
      // vrijkaartjes
      await ReserveringMail.send(reservering, "ticket", strReservering);
    } else if (reservering.wachtlijst) {
      await ReserveringMail.send(
        reservering,
        "wachtlijst",
        "Je staat op de wachtlijst"
      );
    } else {
      await ReserveringMail.send(reservering, 'aangevraagd', 'kaarten besteld')
    }

    await Reservering.verwerkRefunds();
    res.send(reservering);
  });
});

router.put("/:id", async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send("no id");
  }

  const params = parseQuery(Reservering, {
    include: ["tickets", "Payments"]
  });
  const reservering = await Reservering.findById(id, params);
  if (!reservering) {
    return res.status(404).send(`not found: ${id}`);
  }

  Reservering.sequelize.transaction(async transaction => {
    await reservering.update(req.body);

    reservering.uitvoering = await Uitvoering.findByPk(
      reservering.uitvoeringId
    );
    await Promise.all(
      req.body.tickets.map(async t => {
        // const prijs = await Prijs.findById(t.prijs.id);
        // const ta = new TicketAggregate(reservering, prijs);
        const ta = reservering.tickets.find(
          ticket => ticket.prijs.id == t.prijs.id
        );
        await ta.setAantal(t.aantal);
        // reservering.tickets.push(ta);
      })
    );

    reservering.wachtlijst = await reservering.moetInWachtrij();
    await reservering.save();

    await reservering.reload(params);
    Reservering.removeHook("afterFind");

    const saldo = reservering.saldo;
    if (saldo < 0) {
      await reservering.createPaymentIfNeeded();
    } else {
      if (saldo > 0 && reservering.teruggeefbaar()) {
        const mixin = require('../models/Refund.mixin');
        Object.assign(Reservering.prototype, mixin);

        await reservering.refund();
      }
      const strReservering = await reservering.asString();
      await ReserveringMail.send(reservering, "gewijzigd", `Gewijzigde bestelling ${strReservering}`);
    }

    await Reservering.verwerkRefunds();
    // wacht op verwerking refunds.
    // pas als terugbetaald is, dan wachtlijst verwerken
    await reservering.uitvoering.verwerkWachtlijst();

    res.send(reservering);
  });
});

router.get("/:id", async (req, res) => {
  const params = parseQuery(Reservering, req.query);

  const reservering = await Reservering.findById(req.params.id, params);
  Reservering.removeHook("afterFind");
  if (!reservering) {
    return res.status(404).send("niet gevonden");
  } else {
    const json = await reservering.toJSONA(req.query);
    res.send(json);
  }
});

router.get("/:id/resend", async (req, res) => {
  const reservering = await Reservering.findById(
    req.params.id,
    parseQuery(Reservering, {})
  );
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
    res.send("OK");
  }
});

router.post("/:id/newPayment", async (req, res) => {
  const params = parseQuery(Reservering, {
    include: ["tickets"]
  });
  const reservering = await Reservering.findByPk(req.params.id, params);
  Reservering.removeHook("afterFind");
  if (!reservering) return res.status(404).send("niet gevonden");

  await reservering.createPaymentIfNeeded();
  const paymentUrl = reservering.paymentUrl();
  if (paymentUrl) {
    res.send({
      paymentUrl
    });
  } else {
    res.send({});
  }
});

router.post("/:id/terugbetaald", auth(["admin"]), async (req, res) => {
  const mixin = require('../models/Refund.mixin');
  Object.assign(Reservering.prototype, mixin);

  const params = parseQuery(Reservering, {
    include: ["tickets"]
  });
  const reservering = await Reservering.findByPk(req.params.id, params);
  if (!reservering) return res.status(404).send("niet gevonden");

  const bedrag = await reservering.nonRefundableAmount();
  if (bedrag) {

    const tickets = await reservering.terugtebetalenTickets();
    await Promise.all(tickets.map(async ticket => {
      ticket.terugbetalen = false;
      ticket.geannuleerd = true;
      const payment = ticket.Payment || await ticket.getPayment();
      payment.paidBack = (payment.paidBack || 0) + ticket.prijs.prijs;
      await payment.save()
      await ticket.save();
    }))
    await reservering.logMessage(`€ ${bedrag.toFixed(2)} terugbetaald`)

    await ReserveringMail.send(reservering, 'terugbetaald', `Openstaand bedrag € ${bedrag.toFixed(2)} terugbetaald`, {
      bedrag: bedrag
    });
  }
  res.send('OK');
});

router.get("/:id/mail", async (req, res) => {
  const params = parseQuery(Reservering, {
    include: ["tickets"]
  });
  const reservering = await Reservering.findByPk(req.params.id, params);
  Reservering.removeHook("afterFind");
  if (!reservering) return res.status(404).send("niet gevonden");
  const html = await ReserveringMail.render(
    reservering,
    req.query.template || 'ticket',
    req.query
  );
  res.send(html);
});

router.get("/:id/qr", async (req, res) => {
  const reservering = await Reservering.findById(req.params.id);
  if (!reservering) return res.status(404).send("niet gevonden");

  const qr = require("qr-image");

  const png = qr.imageSync(reservering.getTicketUrl(), {
    type: "png",
    size: 5,
    margin: 3
  });
  res.type("png").send(png);
});



router.get("/:id/qr_teruggave", async (req, res) => {
  const mixin = require('../models/Refund.mixin');
  Object.assign(Reservering.prototype, mixin);
  const params = parseQuery(Reservering, {
    include: ['tickets', 'Payments']
  })
  const reservering = await Reservering.findById(req.params.id, params);
  const getBic = require('bic-from-iban');
  if (!reservering) return res.status(404).send("niet gevonden");

  const qr = require("qr-image");
  // https://gathering.tweakers.net/forum/list_messages/1800141
  // https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
  const bedrag = await reservering.nonRefundableAmount();
  const IBAN = reservering.iban.replace(/\s/g, '');
  const BIC = getBic.getBIC(IBAN) || "TRIONL2U";
  const content = `BCD
001
1
SCT
${BIC}
${reservering.tennamevan}
${IBAN}
EUR${bedrag.toFixed(2)}
Terugstorting PlusLeo`

  const png = qr.imageSync(content, {
    type: "png",
    size: 5,
    margin: 3
  });
  res.type("png").send(png);
})

router.delete("/:id", async (req, res) => {
  const params = parseQuery(Reservering, {
    include: ['tickets', 'Payments']
  })
  Reservering.sequelize.transaction(async transaction => {

    const reservering = await Reservering.findById(req.params.id, params);
    if (!reservering) {
      return res.status(404).send("niet gevonden");
    }
    await Promise.all(reservering.tickets.map((ta) => {
      return ta.setAantal(0);
    }))
    const strReservering = await reservering.asString();
    await reservering.logMessage(`${strReservering} geannuleerd`);
    const uitvoering = reservering.uitvoering;
    //    await reservering.destroy();

    await Reservering.verwerkRefunds();
    uitvoering.verwerkWachtlijst();
  })


  res.send(null);
});

module.exports = router;