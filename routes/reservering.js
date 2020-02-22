'use strict';
const auth = require('../middleware/auth');
const express = require('express');
const { transaction } = require('objection');

const { Reservering, Prijs, Ticket, Log } = require('../models');
const TicketAggregate = require('../models/Ticket.Aggregate');
const ReserveringMail = require('../components/ReserveringMail');
const RefundHandler = require('../models/RefundHandler');
const parseQuery = require('./helpers/parseReserveringQuery');

const router = express.Router();

router.get('/', auth(true), async (req, res) => {
  let query = parseQuery(req.query);
  if (req.query.uitvoeringId) {
    query.where('uitvoeringId', req.query.uitvoeringId);
  }

  let reserveringen = await query;

  res.send(reserveringen);
});

router.get('/:id', async (req, res) => {
  const query = parseQuery(req.query);

  // const mixin = require("../models/Refund.mixin");
  // Object.assign(Reservering.prototype, mixin);

  const reservering = await query.findById(req.params.id);
  if (!reservering) {
    return res.status(404).send('niet gevonden');
  } else {
    // const json = await reservering.toJSONA(req.query);
    res.send(reservering);
  }
});

router.post('/', async (req, res) => {
  await transaction(
    Reservering,
    Prijs,
    Ticket,
    async (Reservering, Prijs, Ticket, trx) => {
      /** @type {Reservering} */
      let data = Reservering.cleanProperties(req.body);
      // data.id = uuid();
      let reservering = await Reservering.query().insertAndFetch(data);
      reservering.uitvoering = await reservering.$relatedQuery('uitvoering');
      reservering.ticketAggregates = [];
      await Promise.all(
        req.body.tickets.map(async (t) => {
          const prijs = await Prijs.query().findById(t.prijs.id);
          const ta = new TicketAggregate(reservering, prijs);
          await ta.setAantal(Ticket, t.aantal);
          reservering.ticketAggregates.push(ta);
        })
      );

      const refetched = await reservering
        .$query()
        .withGraphFetched(Reservering.getStandardGraph());
      reservering.$set(refetched);

      // kassa-betaling
      if (res.locals.user && req.body.betaald === true) {
        await Promise.all(
          reservering.onbetaaldeTickets.map(async (ticket) => {
            ticket.betaald = true;
            await ticket.save();
          })
        );
      }

      reservering.wachtlijst = reservering.moetInWachtrij;
      if (reservering.wachtlijst) {
        await reservering.$query().patch({
          wachtlijst: reservering.wachtlijst
        });
      }

      await reservering.createPaymentIfNeeded();
      //await reservering.save();

      const saldo = reservering.saldo;
      const strReservering = reservering.toString();
      if (!saldo) {
        // vrijkaartjes
        await ReserveringMail.send(reservering, 'ticket', strReservering);
      } else if (reservering.wachtlijst) {
        await ReserveringMail.send(
          reservering,
          'wachtlijst',
          'Je staat op de wachtlijst'
        );
      } else {
        await ReserveringMail.send(
          reservering,
          'aangevraagd',
          'kaarten besteld'
        );
      }

      await RefundHandler.verwerkRefunds(Reservering, Ticket);
      res.send(reservering);
    }
  );
});

router.put('/:id', async (req, res) => {
  await transaction(Reservering, async (Reservering, trx) => {
    let id = req.params.id;

    if (!req.params.id) {
      return res.status(400).send('no id');
    }

    const query = parseQuery(
      {
        include: ['tickets']
      },
      Reservering
    );
    const graphExpressionObject = query.graphExpressionObject();

    let reservering = await query.findById(id);
    if (!reservering) {
      return res.status(404).send(`not found: ${id}`);
    }

    // geen wijzigingen meer toestaan nadat de reservering is ingenomen
    if (reservering.ingenomen) {
      return res.status('405').send('reservering is al ingenomen');
    }

    let data = Reservering.cleanProperties(req.body);
    reservering = await query
      .withGraphFetched(graphExpressionObject)
      .patchAndFetchById(id, data);
    if (!reservering.ticketAggregates) {
      reservering.ticketAggregates = TicketAggregate.factory(
        reservering,
        reservering.uitvoering,
        reservering.tickets
      );
    }

    if (req.body.tickets) {
      await Promise.all(
        req.body.tickets.map(async (t) => {
          // const prijs = await Prijs.findByPk(t.prijs.id);
          // const ta = new TicketAggregate(reservering, prijs);
          const ta = reservering.ticketAggregates.find(
            (ticket) => ticket.prijs.id == t.prijs.id
          );
          await ta.setAantal(Ticket, t.aantal);
          // reservering.tickets.push(ta);
        })
      );
    }

    reservering.wachtlijst = await reservering.moetInWachtrij;
    await reservering.$query().patch({
      wachtlijst: reservering.wachtlijst
    });

    const saldo = reservering.saldo;

    if (saldo < 0) {
      await reservering.createPaymentIfNeeded();
    }

    // geef de Reservering en Ticket binnen deze transactie door
    await RefundHandler.verwerkRefunds(Reservering, Ticket);

    // wacht op verwerking refunds.
    // pas als terugbetaald is, dan wachtlijst verwerken
    await reservering.uitvoering.verwerkWachtlijst(trx);

    // nu kunnen er weer tickets doorverkocht zijn
    await RefundHandler.verwerkRefunds(Reservering, Ticket);

    const refetched = await reservering
      .$query()
      .withGraphFetched(Reservering.getStandardGraph());
    reservering.$set(refetched);

    if (saldo >= 0) {
      await ReserveringMail.send(
        reservering,
        'gewijzigd',
        `Gewijzigde bestelling ${reservering}`
      );
    }

    res.send(reservering);
  });
});

router.delete('/:id', async (req, res) => {
  await transaction(Reservering, Ticket, async (Reservering, Ticket, trx) => {
    const query = parseQuery(
      {
        include: ['tickets', 'payments']
      },
      Reservering
    );

    const reservering = await query.findById(req.params.id);
    if (!reservering) {
      return res.status(404).send('niet gevonden');
    }

    await Promise.all(
      reservering.ticketAggregates.map(async (ta) => {
        await ta.setAantal(Ticket, 0);
      })
    );

    // const strReservering = await reservering.toString();
    await Log.addMessage(reservering, `${reservering} geannuleerd`);

    await RefundHandler.verwerkRefunds(Reservering, Ticket);

    // wacht op verwerking refunds.
    // pas als terugbetaald is, dan wachtlijst verwerken
    await reservering.uitvoering.verwerkWachtlijst(trx);

    // nu kunnen er weer tickets doorverkocht zijn
    await RefundHandler.verwerkRefunds(Reservering, Ticket);

    const refetched = await reservering
      .$query()
      .withGraphFetched(Reservering.getStandardGraph());
    reservering.$set(refetched);

    if (reservering.validTickets.length === 0) {
      await reservering.$query(trx).delete();
    } else {
      // nog niet alles verkocht. Stuur laatste status op
      await ReserveringMail.send(
        reservering,
        'gewijzigd',
        `${reservering} te koop aangeboden`
      );
    }

    res.send('OK');
  });
});

router.put('/:id/ingenomen', auth(['kassa']), async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send('no id');
  }

  let reservering = await Reservering.findByPk(id);
  if (!reservering) {
    return res.status(404).send(`not found: ${id}`);
  }

  // geen wijzigingen meer toestaan nadat de reservering is ingenomen
  if (reservering.ingenomen) {
    return res.status('405').send('reservering is al ingenomen');
  }

  Reservering.sequelize.transaction(async (transaction) => {
    await reservering.update(req.body);

    res.send(reservering);
  });
});

router.get('/:id/resend', async (req, res) => {
  const query = parseQuery(req.query);

  // const mixin = require("../models/Refund.mixin");
  // Object.assign(Reservering.prototype, mixin);

  const reservering = await query.findById(req.params.id);
  if (!reservering) {
    return res.status(404).send('niet gevonden');
  } else {
    const saldo = reservering.saldo;

    if (saldo >= 0) {
      const strReservering = await reservering.asString();
      ReserveringMail.send(
        reservering,
        'ticket',
        `Kaarten voor ${strReservering}`
      );
    } else {
      ReserveringMail.send(
        reservering,
        'paymentFailure',
        'Betalingsherinnering'
      );
    }
    res.send('OK');
  }
});

router.post('/:id/newPayment', async (req, res) => {
  const query = parseQuery({
    include: ['tickets']
  });
  const reservering = await query.findById(req.params.id);
  if (!reservering) return res.status(404).send('niet gevonden');

  await reservering.createPaymentIfNeeded();
  const paymentUrl = reservering.paymentUrl;
  if (paymentUrl) {
    res.send({
      paymentUrl
    });
  } else {
    res.send({});
  }
});

router.post('/:id/terugbetaald', auth(['admin']), async (req, res) => {
  const params = parseQuery({
    include: ['tickets']
  });
  const reservering = await Reservering.findByPk(req.params.id, params);
  if (!reservering) return res.status(404).send('niet gevonden');
  const refund = new RefundHandler(reservering);

  const bedrag = refund.nonRefundableAmount();
  if (bedrag) {
    const tickets = refund.terugtebetalenTickets();
    await Promise.all(
      tickets.map(async (ticket) => {
        ticket.terugbetalen = false;
        ticket.geannuleerd = true;
        const payment = ticket.payment;
        payment.paidBack = (payment.paidBack || 0) + ticket.prijs.prijs;
        await payment.update({
          paidBack: payment.paidBack
        });
        await ticket.update({
          terugbetalen: ticket.terugbetalen,
          geannuleerd: ticket.geannuleerd
        });
      })
    );
    await Log.addMessage(reservering, `€ ${bedrag.toFixed(2)} terugbetaald`);

    await ReserveringMail.send(
      reservering,
      'terugbetaald',
      `Openstaand bedrag € ${bedrag.toFixed(2)} terugbetaald`,
      {
        bedrag: bedrag
      }
    );
  }
  res.send('OK');
});

router.get('/:id/mail', async (req, res) => {
  const query = parseQuery({
    include: ['tickets']
  });
  const reservering = await query.findById(req.params.id);
  if (!reservering) return res.status(404).send('niet gevonden');
  const html = await ReserveringMail.render(
    reservering,
    req.query.template || 'ticket',
    req.query
  );
  res.send(html);
});

router.get('/:id/qr', async (req, res) => {
  const reservering = await Reservering.query().findById(req.params.id);
  if (!reservering) return res.status(404).send('niet gevonden');

  const qr = require('qr-image');

  const png = qr.imageSync(reservering.getTicketUrl(), {
    type: 'png',
    size: 5,
    margin: 3
  });
  res.type('png').send(png);
});

// router.get('/:id/qr_teruggave', async (req, res) => {
//   const mixin = require('../models/RefundHandler');
//   Object.assign(Reservering.prototype, mixin);
//   const params = parseQuery(Reservering, {
//     include: ['tickets', 'Payments']
//   });
//   const reservering = await Reservering.findByPk(req.params.id, params);
//   const getBic = require('bic-from-iban');
//   if (!reservering) return res.status(404).send('niet gevonden');

//   const qr = require('qr-image');
//   // https://gathering.tweakers.net/forum/list_messages/1800141
//   // https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
//   const bedrag = await reservering.nonRefundableAmount();
//   const IBAN = reservering.iban.replace(/\s/g, '');
//   const BIC = getBic.getBIC(IBAN) || 'TRIONL2U';
//   const content = `BCD
// 001
// 1
// SCT
// ${BIC}
// ${reservering.tennamevan}
// ${IBAN}
// EUR${bedrag.toFixed(2)}
// Terugstorting PlusLeo`;

//   const png = qr.imageSync(content, {
//     type: 'png',
//     size: 5,
//     margin: 3
//   });
//   res.type('png').send(png);
// });

module.exports = router;
