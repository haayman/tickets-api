"use strict";

import { Transporter, createTransport } from "nodemailer";
import config from "config";
import EmailTemplates from "email-templates";
import path from "path";

export class Mailer {
  private transporter: Transporter;
  private from: string;
  private to: string;
  private template: string;
  private subject: string;

  constructor(params = {}) {
    this.transporter = this.createTransport(params);
    this.setFrom(
      config.get("email.afzender_email"),
      config.get("email.afzender")
    );
  }
  createTransport(params = {}) {
    params = Object.assign({}, config.get("mail_transport"), params);
    return createTransport(params);
  }

  setSubject(subject: string) {
    const prefix = config.get("email.subject_prefix");
    this.subject = prefix ? `${prefix} ${subject}` : subject;
    return this;
  }

  setTo(email: string, naam?: string) {
    this.to = this.getRecipient(email, naam, true);
    return this;
  }

  setFrom(email: string, name?: string) {
    this.from = this.getRecipient(email, name, false);
    return this;
  }

  setTemplate(templateName) {
    this.template = templateName;
    return this;
  }

  initTemplate() {
    return new EmailTemplates({
      views: {
        root: path.join(path.resolve(__dirname, "../emails/")),
        options: {
          extension: "ejs",
        },
      },
    });
  }

  async send(params) {
    try {
      const template = this.initTemplate();
      const html = await template.render(this.template, params);
      const options = {
        from: this.from,
        to: this.to,
        subject: this.subject,
        html: html,
        bcc: undefined,
      };
      if (config.has("email.bcc")) {
        options.bcc = config.get("email.bcc");
      }
      await this.transporter.sendMail(options);
    } catch (e) {
      throw e;
    }
  }

  async render(params) {
    try {
      const template = this.initTemplate();
      return await template.render(this.template, params);
    } catch (e) {
      throw e;
    }
  }

  getRecipient(email: string, naam?: string, override = true) {
    if (override && config.has("email.alwaysTo")) {
      email = config.get("email.alwaysTo");
    }

    let emailString;
    if (naam) {
      emailString = `"${naam}" <${email}>`;
    } else {
      emailString = email;
    }

    return emailString;
  }
}
