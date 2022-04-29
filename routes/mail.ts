/**
 * controller om iedereen een mail na te sturen
 */
import express from "express";
import auth from "../middleware/auth";
import { Mailer } from "../components/Mailer";
import ejs from "ejs";
import { getRepository } from "../models/Repository";
import { findTemplate } from "../components/ReserveringMail";
import { Reservering, User } from "../models";

const router = express.Router();

function nl2br(str) {
  const breakTag = "<br />";
  return (str + "").replace(
    /([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,
    "$1" + breakTag + "$2"
  );
}

async function send(
  reservering: Reservering,
  subject: string,
  template: string
) {
  const mail = new Mailer();
  const content = nl2br(
    ejs.render(template, {
      reservering,
      naam: reservering.naam,
      email: reservering.email,
      findTemplate,
    })
  );
  mail
    .setTemplate("custom")
    .setTo(reservering.email, reservering.naam)
    .setSubject(subject);

  await mail.send({
    content,
    findTemplate,
  });
}

async function render(
  reservering: Reservering,
  subject: string,
  template: string
) {
  const mail = new Mailer();
  const content = nl2br(
    ejs.render(template, {
      reservering,
      naam: reservering.naam,
      email: reservering.email,
      findTemplate,
    })
  );

  const result = await mail.setTemplate("custom").render({
    content: content,
    findTemplate,
  });
  return result;
}

router.post("/", auth(["admin"]), async (req, res) => {
  const { subject, content, test, uitvoeringIds } = req.body;
  let reserveringen;

  if (test) {
    const userRepository = getRepository<User>("User");
    const user = await userRepository.findOne(res.locals.user.id);

    const reservering = new Reservering();

    reservering.naam = user.name;
    reservering.email = user.email;
    reserveringen = [reservering];
  } else {
    const reserveringRepository = getRepository<Reservering>("Reservering");
    reserveringen = await reserveringRepository.find({
      uitvoering: { $in: uitvoeringIds },
    });
  }

  await Promise.all(
    reserveringen.map(async (reservering) => {
      await send(reservering, subject, content);
    })
  );

  if (test) {
    const result = await render(reserveringen[0], subject, content);
    res.send(result);
  } else {
    res.send(`${reserveringen.length} mails verzonden`);
  }
});

export default router;
