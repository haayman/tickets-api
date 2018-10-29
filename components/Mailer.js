"use strict";

const nodemailer = require("nodemailer");
const config = require("config");
const EmailTemplates = require("email-templates");
const path = require("path");

module.exports = class Mailer {
  constructor(params = {}) {
    this.transporter = this.createTransport(params);
    this.from = this.getRecipient(
      config.get("email.afzender_email"),
      config.get("email.afzender")
    );
  }
  createTransport(params = {}) {
    params = Object.assign({}, config.get("mail_transport"), params);
    return nodemailer.createTransport(params);
  }

  setSubject(subject) {
    const prefix = config.get("email.subject_prefix");
    this.subject = prefix ? `${prefix} ${subject}` : subject;
    return this;
  }

  setTo(email, naam) {
    this.to = this.getRecipient(email, naam, true);
    return this;
  }

  setFrom(email, naam) {
    this.from = this.getRecipient(email, name);
    return this;
  }

  setTemplate(templateName) {
    this.template = templateName;
    return this;
  }

  initTemplate() {
    return new EmailTemplates({
      root: path.join(__dirname, "./templates"),
      views: {
        options: {
          extension: "ejs"
        }
      }
    });
  }

  async send(params) {
    const template = this.initTemplate();
    const html = await template.render(this.template, params);
    await this.transporter.sendMail({
      from: this.from,
      to: this.to,
      subject: this.subject,
      html: html,
    })
  }

  async render(params) {
    const template = this.initTemplate();
    return await template.render(this.template, params);
  }

  getRecipient(email, naam, override = false) {
    let alwaysTo;
    if (override && (alwaysTo = config.has("email.alwaysTo"))) {
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
};