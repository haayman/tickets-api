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

const router = express.Router();

router.post("/bank/:id", async (req, res) => {
  winston.info(req.body);
  const mollie_payment = await mollie.payments.get(req.body.id);
  const reservering = await Reservering.findById(req.params.id);
  const payment = reservering.payments.find((p) => p.paymentId == mollie_payment.id);
  if (payment.betaalstatus == mollie_payment.status) {
    // dubbele melding
    return res.send('OK');
  }
  await payment.setStatus();

  await reservering.reload({
    include: [{
      all: true,
      nested: true
    }]
  });

  const tickets = await payment.getTickets();
  reservering.logMessage(`Status ${Ticket.describe(tickets)}: ${payment.betaalstatus}`);

  if (payment.betaalstatus == "paid") {
    ReserveringMail.send(
      reservering,
      "confirmationPayment",
      `ticket ${reservering}`
    );
  } else {
    ReserveringMail.send(reservering, "paymentFailure", "Betaling mislukt");
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