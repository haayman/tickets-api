const Mailer = require("./Mailer");
const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const parseQuery = require('../routes/helpers/parseReserveringQuery');

class ReserveringMail {
  static async send(reservering, templateName, subject, params = {}) {
    const mail = new Mailer();
    const {
      Reservering
    } = reservering.sequelize.models;

    await reservering.reload(parseQuery(Reservering, {
      include: [
        'tickets',
        'Payments'
      ]
    }));

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
    reservering.logMessage(`Mail '${subject}' verzonden`)
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