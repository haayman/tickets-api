import { Mailer } from "./Mailer";
import format from "date-fns/format";
import nl from "date-fns/locale/nl";
import { Log, Reservering } from "../models";
import winston from "winston";
import config from "config";
import { existsSync } from "fs";
import { resolve, extname } from "path";

export function findTemplate(path: string) {
  const roots: string[] = config.get("email_roots");
  if (!extname(path)) {
    path += ".ejs";
  }
  for (const root of roots) {
    const file = resolve(root, path);
    if (existsSync(file)) {
      return file;
    }
  }
}

export class ReserveringMail {
  static async send(
    reservering: Reservering,
    templateName: string,
    subject: string,
    params: any = {}
  ) {
    try {
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
          findTemplate,
          nl,
        })
      );
      winston.info(`Mail '${subject}' verzonden`, {
        to: reservering.email,
      });
      winston.info(reservering.getMailUrl(templateName));
      Log.addMessage(r, `Mail '${subject}' verzonden`);
    } catch (e) {
      // zorg dat mailer nooit een error geeft die het proces stopt
      winston.error(e);
    }
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
          findTemplate,
        })
      );

      return content;
    } catch (e) {
      throw e;
    }
  }
}
