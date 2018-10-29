const Mailer = require("./Mailer");
const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')


class ReserveringMail {
  static send(reservering, templateName, subject, params = {}) {
    const mail = new Mailer();

    mail
      .setTemplate("index")
      .setTo(reservering.email, reservering.naam)
      .setSubject(subject);

    if (params.to) {
      mail.setTo(params.to)
    }

    mail.send(Object.assign({}, params, {
      template: templateName,
      reservering,
      format,
      nl
    }));
  }

  static async render(reservering, templateName, params = {}) {
    const mail = new Mailer();
    const content = await mail.setTemplate("index").render(
      Object.assign({}, params, {
        template: templateName,
        reservering: reservering,
        format,
        nl
      })
    );

    return content;
  }
}

module.exports = ReserveringMail;