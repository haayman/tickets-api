import { Mailer } from "./Mailer";
import format from "date-fns/format";
import nl from "date-fns/locale/nl";
import { Log, Reservering } from "../models";
import winston from "winston";

export class ReserveringMail {
  static async send(
    reservering: Reservering,
    templateName: string,
    subject: string,
    params: any = {}
  ) {
    const r = reservering;

    const mail = new Mailer();
    mail.setTemplate("index").setTo(r.email, r.naam).setSubject(subject);

    if (params.to) {
      mail.setTo(params.to);
    }

    await mail.send(
      Object.assign({}, params, {
        template: templateName,
        reservering: r,
        format,
        nl,
      })
    );
    winston.info(`Mail '${subject}' verzonden`, {
      to: reservering.email,
    });
    winston.info(reservering.getMailUrl(templateName));
    Log.addMessage(r, `Mail '${subject}' verzonden`);
  }

  static async render(reservering, templateName, params = {}) {
    try {
      const mail = new Mailer();
      const content = await mail.setTemplate("index").render(
        Object.assign({}, params, {
          template: templateName,
          reservering: reservering,
          format,
          nl,
        })
      );

      return content;
    } catch (e) {
      throw e;
    }
  }
}
