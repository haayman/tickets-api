const express = require('express');
const config = require('config');
const { createMollieClient } = require('@mollie/api-client');
const mollie_key = config.get('payment.mollie_key');
const mollie = createMollieClient({ apiKey: mollie_key });
const { Reservering, Payment, Ticket, Log } = require('../models');
const winston = require('winston');
const ReserveringMail = require('../components/ReserveringMail');
const parseQuery = require('./helpers/parseReserveringQuery');

const router = express.Router();

router.post('/bank/:id', async (req, res) => {
  winston.info(req.body);
  const mollie_payment = await mollie.payments.get(req.body.id);
  const query = parseQuery(
    {
      include: ['tickets', 'payments']
    },
    Reservering
  );

  let reservering = await query.findById(req.params.id);
  if (!reservering) {
    return res.send('OK'); // niet langer proberen
  }
  const payment = reservering.payments.find(
    (p) => p.paymentId == mollie_payment.id
  );
  if (payment.betaalstatus == mollie_payment.status) {
    // dubbele melding
    return res.send('OK');
  }
  await payment.setStatus();

  // await reservering.reload(params);
  const refetched = await reservering
    .$query()
    .withGraphFetched(Reservering.getStandardGraph());
  reservering.$set(refetched);

  const tickets = await payment.getTickets();
  const description = Ticket.description(tickets);
  await Log.addMessage(
    reservering,
    `Status ${description}: ${payment.betaalstatus}`
  );

  if (payment.betaalstatus == 'paid') {
    await ReserveringMail.send(
      reservering,
      'confirmationPayment',
      `Kaarten voor ${reservering}`
    );
  } else {
    await ReserveringMail.send(
      reservering,
      'paymentFailure',
      'Betaling mislukt'
    );
  }
  res.send('OK');
});

router.get('/done/:id', async (req, res) => {
  const payment = await Payment.query().findOne({
    reserveringId: req.params.id
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
