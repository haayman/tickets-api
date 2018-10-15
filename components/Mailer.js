"use strict";

const nodemailer = require("nodemailer");
const config = require("config");
const EmailTemplates = require("swig-email-templates");
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
    this.subject = subject;
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

  send(params) {
    return new Promise((resolve, reject) => {
      const templates = new EmailTemplates({
        root: path.join(__dirname, "./templates")
      });
      templates.render(this.template, params, (err, html, text) => {
        if (err) {
          reject(new Error(err));
        } else {
          this.transporter.sendMail(
            {
              from: this.from,
              to: this.to,
              subject: this.subject,
              html: html,
              text: text
            },
            (err, info) => {
              if (err) {
                reject(new Error(err));
              } else {
                resolve(info);
              }
            }
          );
        }
      });
      // const sendMail = this.transporter.templateSender(
      //   new EmailTemplates( this.template),
      //   {
      //     from: this.from
      //   }
      // );
      // sendMail(
      //   {
      //     to: this.to,
      //     subject: this.subject
      //   },
      //   params,
      //   (err, info) => {
      //     if (err) {
      //       reject(new Error(err));
      //     }
      //     resolve(info);
      //   }
      // );
    });
  }

  getRecipient(email, naam, override = false) {
    let alwaysTo;
    if (override && (alwaysTo = config.has("email.alwaysTo"))) {
      // if (naam) {
      //   naam += ` (oorspronkelijk adres: ${email})`;
      // } else {
      //   naam = `(oorspronkelijk adres: ${email})`;
      // }
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
