const express = require("express");
const config = require("config");
const auth = require("../middleware/auth");
const Mailer = require('../components/Mailer');
const ejs = require('ejs');

const {
  Reservering,
  User
} = require("../models");
const winston = require("winston");
const ReserveringMail = require("../components/ReserveringMail");
const parseQuery = require('./helpers/parseReserveringQuery');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const router = express.Router();

function nl2br(str) {
  const breakTag = '<br />';
  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

async function send(reservering, subject, template) {
  const mail = new Mailer();
  const content = nl2br(ejs.render(template, {
    reservering,
    naam: reservering.naam,
    email: reservering.email
  }))
  mail.setTemplate('custom')
    .setTo(reservering.email, reservering.naam)
    .setSubject(subject)

  await mail.send({
    content
  });
}

async function render(reservering, subject, template) {
  const mail = new Mailer();
  const content = nl2br(ejs.render(template, {
    reservering,
    naam: reservering.naam,
    email: reservering.email
  }));

  const result = await mail.setTemplate('custom').render({
    content: content
  })
  return result;
}

router.post("/", auth(['admin']), async (req, res) => {
  const {
    subject,
    content,
    test,
    uitvoeringIds
  } = req.body;
  let reserveringen;

  if (test) {
    const user = await User.findByPk(res.locals.user.id);
    const reservering = Reservering.build({
      naam: user.name,
      email: user.email
    })
    reserveringen = [reservering];
  } else {
    reserveringen = await Reservering.findAll({
      where: {
        uitvoeringId: {
          [Op.in]: uitvoeringIds
        }
      }
    });
  }

  await Promise.all(reserveringen.map(async reservering => {
    await send(reservering, subject, content);
  }))

  if (test) {
    const result = await render(reserveringen[0], subject, content);
    res.send(result);
  } else {
    res.send(`${reserveringen.length} mails verzonden`);
  }
});

module.exports = router;
