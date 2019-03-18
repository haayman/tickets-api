const Mailer = require("./mail");
const config = require("config");

class AppMail {
  static send(reservering, templateName, params = {}) {
    const mail = new Mailer();
    const afzender = config.get("email.afzender");
    const afzender_mail = config.get("email.mail_afzender");
    const subjects = config.get("email.subjects");

    mail.setSubject(`[${afzender}] ${subjects[temlateName]}`);
    mail.setTo(reservering.email, reservering.naam);
    mail.setFrom(afzender_mail, afzender);
    mail.setReplyTo(afzender_mail, afzender);

    mail.setMessage("message");

    mail.send();
  }
}
