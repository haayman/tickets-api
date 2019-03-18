const express = require("express");
const config = require("config");
const mollie_key = config.get("payment.mollie_key");
const mollie = require("@mollie/api-client")({
  apiKey: mollie_key
});
const {
  Reservering,
  Payment,
  Ticket
} = require("../models");
const winston = require("winston");
const ReserveringMail = require("../components/ReserveringMail");
const parseQuery = require('./helpers/parseReserveringQuery');

const router = express.Router();

router.post("/bank/:id", async (req, res) => {
  winston.info(req.body);
  const mollie_payment = await mollie.payments.get(req.body.id);
  const params = parseQuery(Reservering, {
    include: ['tickets', 'Payments']
  });

  let reservering = await Reservering.findByPk(req.params.id, params);
  const payment = reservering.Payments.find((p) => p.paymentId == mollie_payment.id);
  if (payment.betaalstatus == mollie_payment.status) {
    // dubbele melding
    return res.send('OK');
  }
  await payment.setStatus();

  // await reservering.reload(params);
  reservering = await Reservering.findByPk(reservering.id, params);

  const tickets = await payment.getTickets();
  const description = await Ticket.description(tickets);
  await reservering.logMessage(`Status ${description}: ${payment.betaalstatus}`);

  const ticketDescription = await reservering.asString();

  if (payment.betaalstatus == "paid") {
    await ReserveringMail.send(
      reservering,
      "confirmationPayment",
      `Kaarten voor ${ticketDescription}`
    );
  } else {
    await ReserveringMail.send(reservering, "paymentFailure", "Betaling mislukt");
  }
  res.send("OK");
});

router.get("/done/:id", async (req, res) => {
  const payment = await Payment.findOne({
    where: req.query.payment_id
  });
  const mollie_payment = await mollie.payments.get(payment.paymentId);
  const isPaid = await mollie_payment.isPaid;
  if (isPaid) {
    res.redirect(`/reserveren/${req.params.id}/done`);
  } else {
    res.redirect(`/reserveren/${req.params.id}/failed`);
  }
});

module.exports = router;