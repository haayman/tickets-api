const Mailer = require("./Mailer");
const config = require("config");
const EmailTemplates = require("swig-email-templates");

class ReserveringMail {
  static send(reservering, templateName, params = {}) {
    const mail = new Mailer();
    const afzender = config.get("email.afzender");
    const afzender_mail = config.get("email.mail_afzender");
    const subjects = config.get("email.subjects");

    let templates = new EmailTemplates();

    templates.render(
      "./templates/Telmah.html",
      { reservering: reservering },
      (err, html, text, subject) => {
        transporter.sendMail({
          from: afzender,
          to: "arjen.haayman@gmail.com",
          subject: subject,
          html: html,
          text: text
        });
      }
    );
  }
}

module.exports = ReserveringMail;
