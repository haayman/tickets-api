const config = require("config");

const TicketAggregate = require("./Ticket.Aggregate");
const ReserveringMail = require("../components/ReserveringMail");

var differenceInCalendarDays = require("date-fns/difference_in_calendar_days");
const globalData = require("../components/globalData");
const stackTrace = require("stack-trace");
const path = require("path");
const iban = require("iban");

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.models.Payment;

  let Reservering = sequelize.define(
    "Reservering", {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      naam: {
        type: DataTypes.STRING,
        allowUnknown: false
      },
      email: {
        type: DataTypes.STRING,
        allowUnknown: false,
        validate: {
          isEmail: true
        }
      },
      opmerking: {
        type: DataTypes.STRING
      },
      opmerking_gebruiker: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING
      },
      wachtlijst: {
        type: DataTypes.BOOLEAN
      },
      bedrag: {
        type: DataTypes.DECIMAL(5, 2)
      },
      iban: {
        type: DataTypes.STRING,
        validate: {
          validIBAN() {
            if (!iban.isValid(this.iban)) {
              throw new Error("Ongeldig IBAN nummer");
            }
          }
        }
      },
      tennamevan: {
        type: DataTypes.STRING
      }
    }, {
      name: {
        singular: "reservering",
        plural: "reserveringen"
      },
      paranoid: true, // zorgt er voor dat dit nooit echt verwijderd wordt
      timestamps: true,
      getterMethods: {
        bedrag() {
          return this.tickets ?
            this.tickets.reduce((bedrag, t) => bedrag + t.getBedrag(), 0) :
            null;
        },
        saldo() {
          // bereken het totaal betaalde bedrag
          if (!this.payments) {
            return null;
          }
          let saldo = this.payments.reduce((saldo, payment) => {
            if (payment.isPaid) {
              return saldo + (+payment.amount - (payment.amountRefunded || 0));
            } else {
              return saldo;
            }
          }, 0);

          // bereken kosten van alle te betalen tickets
          saldo = this.tickets.reduce((saldo, ticket) => {
            return (
              saldo - ticket.getBedrag(ticket.aantal - ticket.aantaltekoop)
            );
          }, saldo);

          return saldo;
        },
        openstaandBedrag() {
          return -this.saldo;
        },

        validTickets() {
          return this.Tickets ?
            this.Tickets.filter(t => !(t.geannuleerd || t.verkocht)) : [];
          // this.Tickets.reduce((validTickets, ticket) => {
          //   return validTickets.concat(ticket.validTickets);
          // }, []) : [];
        },

        /**
         * het bedrag dat teveel is betaald
         */

        tegoed() {
          if (!this.validTickets) {
            return null;
          }
          return this.validTickets.reduce(
            (tegoed, ticket) => tegoed + ticket.tegoed,
            0
          );
        },

        /**
         * aantal gereserveerde plaatsen
         */
        aantal() {
          if (!this.tickets) {
            return null;
          }
          return this.tickets.reduce((aantal, ticket) => aantal + ticket.aantal, 0)
        },

        onbetaaldeTickets() {
          return this.validTickets.filter(t => !t.betaald);
        },

        isPaid() {
          let retval = false;
          if (!this.payment) {
            return null;
          }

          for (let payment of this.payments) {
            if (!payment.isPaid) {
              return false;
            } else {
              retval = true;
            }
          }
          return retval;
        },

        redirectUrl() {
          return this.getRoot() + "/api/payment/done/" + this.id;
        },

        webhookUrl() {
          return this.getWebhookRoot() + "/api/payment/bank/" + this.id;
        }
      },

      hooks: {
        beforeDestroy: async reservering => {
          const {
            Payment,
            Ticket
          } = require("./");
          Payment.destroy({
            where: {
              reserveringId: reservering.id
            }
          });
          Ticket.destroy({
            where: {
              reserveringId: reservering.id
            }
          });
        }
      }
    }
  );

  Reservering.initTickets = async function (reservering) {
    if (!reservering) {
      return;
    }
    if (reservering.length !== undefined) {
      await Promise.all(reservering.map(r => r.initTickets()));
    } else {
      await reservering.initTickets();
    }
  };

  Reservering.prototype.initTickets = async function () {
    if (!this.uitvoering) this.uitvoering = await this.getUitvoering();
    if (!this.tickets) {
      const voorstelling =
        this.uitvoering.voorstelling ||
        (await this.uitvoering.getVoorstelling());
      const prijzen = voorstelling.prijzen || (await voorstelling.getPrijzen());
      const Tickets = this.Tickets || (await this.getTickets());
      this.tickets = await Promise.all(
        prijzen.map(async prijs => {
          return new TicketAggregate(
            this,
            prijs,
            Tickets.filter(t => t.prijsId == prijs.id)
          );
        })
      );
    }
    if (!this.payments) this.payments = await this.getPayments();
    if (!this.logs) this.logs = await this.getLogs();
  };

  Reservering.prototype.getAttr = async function (attr) {
    let value = this[attr];
    if (typeof value === 'function') {
      value = this[attr]();
    }
    if (value instanceof Promise) {
      value = await value;
    }

    return value;
  }

  Reservering.prototype.toJSONA = async function (req = null) {
    const json = await this.toJSON();
    json.uitvoering = await this.getUitvoering();
    json.tickets = this.tickets;
    json.payments = await this.getPayments();
    json.paymentUrl = this.paymentUrl();
    json.teruggeefbaar = await this.teruggeefbaar();
    if (this.Logs) {
      json.logs = this.Logs;
    }
    if (this.StatusUpdates) {
      json.StatusUpdates = this.StatusUpdates;
    }
    if (req && req.extraFields) {
      await Promise.all(req.extraFields.map(async (attr) => {
        json[attr] = await this.getAttr(attr);
      }));
    }
    return json;
  };

  Reservering.prototype.setStatus = async function (
    status,
    betaalstatus = true
  ) {
    this.status = status;
    const StatusUpdate = this.sequelize.models.StatusUpdate;
    await this.addStatusUpdate(
      StatusUpdate.build({
        status,
        betaalstatus
      })
    );
  };

  (Reservering.prototype.moetInWachtrij = async function () {
    const uitvoering = await this.getUitvoering();
    const vrije_plaatsen = await uitvoering.getVrijePlaatsen(this.id);
    return vrije_plaatsen <= 0;
  }),
  (Reservering.prototype.paymentUrl = function () {
    let url;
    if (!this.payments) return null;
    for (let payment of this.payments) {
      if ((url = payment.paymentUrl)) {
        return url;
      }
    }
    return null;
  });

  Reservering.prototype.createPaymentIfNeeded = async function () {
    if (!this.Tickets) {
      this.Tickets = await this.getTickets();
    }
    if (!this.payments) {
      this.payments = await this.getPayments();
    }
    if (
      !this.wachtlijst &&
      this.onbetaaldeTickets.length &&
      this.payments.filter(p => p.status == "open").length === 0
    ) {
      const payment = Payment.build({
        reserveringId: this.id
      });
      await payment.newPayment(this);
      // await payment.save();
      // await this.addPayment(payment);
      // waarom is dit nog nodig???
      this.payments = (this.payments || []).concat([payment]);
    }
  };

  Reservering.prototype.extraBetaling = async function () {
    const payment = Payment.build();

    // hier wordt automatisch een nieuw payment + bedrag aangemaakt
    await payment.setReservering(this);

    return payment;
  };

  Reservering.prototype.haalUitWachtrij = async function () {
    this.wachtlijst = false;
    await this.save();
    ReserveringMail.send(this, "uit_wachtlijst", `uit wachtlijst`);
  };

  Reservering.prototype.logMessage = async function (message) {
    const Log = Reservering.sequelize.models.Log;
    // if( user = Application.getUser()) {
    //   message += ` (door ${user.name})`;
    // }

    const trace = stackTrace.get();
    const caller = trace[1];

    await Log.create({
      reserveringId: this.id,
      message: message,
      sourceCode: `${path.basename(
        caller.getFileName()
      )}(${caller.getLineNumber()})`
    });
  };

  Reservering.prototype.getBetalingUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/betalen`;
  };

  Reservering.prototype.getResendUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/resend`;
  };

  Reservering.prototype.getEditLink = function () {
    return this.getRoot() + `/reserveren/${this.id}/edit`;
  };

  Reservering.prototype.getTicketUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/details`;
  };

  Reservering.prototype.getIBANUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/iban`;
  };

  Reservering.prototype.getQrUrl = function () {
    return this.getWebhookRoot() + `/api/reservering/${this.id}/qr`;
  };

  Reservering.prototype.getRoot = function () {
    //return globalData.get("server");
    return config.get('server.url');
    // return 'https://reserveren.plusleo.nl/';
  };

  Reservering.prototype.getWebhookRoot = function () {
    const root = globalData.get("localtunnel") ?
      globalData.get("localtunnel") :
      config.get("server.url");
    console.log('webhook', root);
    // return 'https://reserveren.plusleo.nl/';
    return root;
  };


  Reservering.prototype.asString = async function () {
    const tickets = this.Tickets ? this.Tickets : await this.getTickets();
    const description = await this.sequelize.models.Ticket.description(tickets);
    return description;
  };

  Reservering.prototype.teruggeefbaar = async function () {
    const uitvoering = await this.getUitvoering();
    const today = new Date();
    const days = config.get("teruggave_termijn");
    const diff = differenceInCalendarDays(uitvoering.aanvang, today);

    return diff > days;
  };

  Reservering.prototype.hasRefunds = async function () {
    const payments = await this.getPayments();
    return payments.find(p => p.refunds).length;
  };

  Reservering.verwerkRefunds = async function () {
    const mixin = require('./Refund.mixin');
    Object.assign(Reservering.prototype, mixin);

    const Ticket = Reservering.sequelize.models.Ticket;
    const reserveringen = await Reservering.findAll({
      include: [{
        model: Ticket,
        where: {
          terugbetalen: true
        },
        required: true
      }]
    });

    await Promise.all(
      reserveringen.map(async reservering => reservering.refund())
    );
  };



  Reservering.associate = function (models) {
    Reservering.Uitvoering = models.Reservering.belongsTo(models.Uitvoering, {
      onDelete: "RESTRICT",
      foreignKey: {
        allowNull: false
      }
    });

    Reservering.Tickets = models.Reservering.hasMany(models.Ticket, {
      onDelete: "cascade"
    });
    Reservering.Payments = models.Reservering.hasMany(models.Payment, {
      onDelete: "cascade"
    });
    Reservering.Logs = models.Reservering.hasMany(models.Log);
    Reservering.StatusUpdates = models.Reservering.hasMany(
      models.StatusUpdate, {
        onDelete: "cascade"
      }
    );
  };

  return Reservering;
};