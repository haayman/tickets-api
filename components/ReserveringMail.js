const Mailer = require("./Mailer");
const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const parseQuery = require('../routes/helpers/parseReserveringQuery');

class ReserveringMail {
  static async send(reservering, templateName, subject, params = {}) {
    const {
      Reservering
    } = reservering.sequelize.models;

    const r = await Reservering.findByPk(reservering.id, parseQuery(Reservering, {
      include: [
        'tickets',
        'Payments'
      ]
    }));

    const mail = new Mailer();
    mail
      .setTemplate("index")
      .setTo(r.email, r.naam)
      .setSubject(subject);

    if (params.to) {
      mail.setTo(params.to)
    }

    await mail.send(Object.assign({}, params, {
      template: templateName,
      reservering: r,
      format,
      nl
    }));
    await r.logMessage(`Mail '${subject}' verzonden`)
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