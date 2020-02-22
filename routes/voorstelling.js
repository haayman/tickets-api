const winston = require('winston');
const auth = require('../middleware/auth');
const express = require('express');
const Voorstelling = require('../models/Voorstelling');
const parseQuery = require('./helpers/parseQuery');

const router = express.Router();

router.get('/', async (req, res) => {
  let query = Voorstelling.query().allowGraph('[uitvoeringen,prijzen]');
  query = parseQuery(query, req.query);

  let voorstellingen = await query;
  // const json = await Promise.all(voorstellingen.map(async v => v.toJSONA(res)));
  res.send(voorstellingen);
});

router.get('/:id', async (req, res) => {
  let query = Voorstelling.query()
    .findById(req.params.id)
    .allowGraph('[uitvoeringen,prijzen]');
  query = parseQuery(query, req.query);

  const voorstelling = await query;
  if (!voorstelling) {
    return res.status(404).send('niet gevonden');
  } else {
    //const json = await voorstelling.toJSONA(res);
    res.send(voorstelling);
  }
});

router.post('/', auth(['admin']), async (req, res) => {
  try {
    delete req.body.id; // verwijder id=null
    const voorstelling = await Voorstelling.query()
      .allowGraph('[uitvoeringen,prijzen]')
      .insertGraphAndFetch(req.body);

    res.send(voorstelling);
  } catch (e) {
    // winston.error(e.message, e);
    res.status(400).send(e.message);
  }
});

router.put('/:id', auth(['admin']), async (req, res) => {
  let id = req.params.id;
  if (!req.params.id) {
    return res.status(400).send('no id');
  }

  let voorstelling = await Voorstelling.query().findById(id);
  if (!voorstelling) {
    return res.status(404).send('not found');
  }

  voorstelling = await Voorstelling.query()
    .allowGraph('[uitvoeringen,prijzen]')
    .upsertGraphAndFetch(req.body);

  res.send(voorstelling);
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  const deleted = await Voorstelling.query().deleteById(req.params.id);
  if (!deleted) {
    return res.status(404).send('niet gevonden');
  }

  res.send(deleted);
});

module.exports = router;
