const config = require("config");

const TicketAggregate = require("./Ticket.Aggregate");
const ReserveringMail = require("../components/ReserveringMail");

var differenceInCalendarDays = require('date-fns/difference_in_calendar_days')
const globalData = require('../components/globalData');

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
      }
    }, {
      name: {
        singular: "reservering",
        plural: "reserveringen"
      },
      timestamps: true,
      getterMethods: {
        bedrag() {
          return this.tickets ?
            this.tickets.reduce((bedrag, t) => bedrag + t.getBedrag(), 0) : null;
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

        async moetInWachtrij() {
          const uitvoering = await this.getUitvoering();
          const vrije_plaatsen = await uitvoering.getVrijePlaatsen(this.id);
          return vrije_plaatsen <= 0;
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

      hooks: {}
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
  }

  Reservering.prototype.initTickets = async function () {
    if (!this.uitvoering) this.uitvoering = await this.getUitvoering();
    if (!this.tickets) {
      const voorstelling = this.uitvoering.voorstelling || await this.uitvoering.getVoorstelling();
      const prijzen = voorstelling.prijzen || await voorstelling.getPrijzen();
      const Tickets = this.Tickets || await this.getTickets();
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

  Reservering.prototype.toJSONA = async function () {
    const json = await this.toJSON();
    json.uitvoering = await this.getUitvoering();
    json.tickets = this.tickets;
    json.payments = await this.getPayments();
    json.paymentUrl = this.paymentUrl();
    if (this.Logs) {
      json.logs = this.Logs;
    }
    if (this.StatusUpdates) {
      json.StatusUpdates = this.StatusUpdates;
    }
    return json;
  };

  Reservering.prototype.setStatus = async function (status, betaalstatus = true) {
    this.status = status;
    const StatusUpdate = this.sequelize.models.StatusUpdate;
    await this.addStatusUpdate(StatusUpdate.build({
      status,
      betaalstatus
    }));
  }


  Reservering.prototype.paymentUrl = function () {
    let url;
    if (!this.payments) return null;
    for (let payment of this.payments) {
      if ((url = payment.paymentUrl)) {
        return url;
      }
    }
    return null;
  };

  Reservering.prototype.createPaymentIfNeeded = async function () {
    if (!this.wachtlijst && this.onbetaaldeTickets.length) {
      const payment = Payment.build({
        reserveringId: this.id
      });
      await payment.newPayment(this);
      // await payment.save();
      // await this.addPayment(payment);
      // waarom is dit nog nodig???
      this.payments = (this.payments || []).concat([
        payment
      ]);
    }

  }

  Reservering.prototype.extraBetaling = async function () {
    const payment = Payment.build();

    // hier wordt automatisch een nieuw payment + bedrag aangemaakt
    await payment.setReservering(this);

    return payment;
  };

  Reservering.prototype.haalUitWachtrij = async function () {
    this.wachtlijst = false;
    await this.save();
    ReserveringMail.send(this, "uit_wachtlijst", `uit wachtlijst ${this}`);
  };

  Reservering.prototype.logMessage = async function (message) {
    const Log = Reservering.sequelize.models.Log;
    // if( user = Application.getUser()) {
    //   message += ` (door ${user.name})`;
    // }

    await Log.create({
      reserveringId: this.id,
      message: message
    });
  };

  Reservering.prototype.getBetalingUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/betalen`
  }

  Reservering.prototype.getResendUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/resend`
  }

  Reservering.prototype.getEditLink = function () {
    return this.getRoot() + `/reserveren/${this.id}/edit`
  }

  Reservering.prototype.getTicketUrl = function () {
    return this.getRoot() + `/reserveren/${this.id}/details`
  }

  Reservering.prototype.getQrUrl = function () {
    return this.getWebhookRoot() + `/api/reservering/${this.id}/qr`
  }

  Reservering.prototype.getRoot = function () {
    return globalData.get('server');
  }

  Reservering.prototype.getWebhookRoot = function () {
    const root = globalData.get('localtunnel') ?
      globalData.get('localtunnel') :
      globalData.get('server')
    return root;
  }

  Reservering.prototype.refund = async function () {
    const terugbetalen = this.Tickets.filter(t => t.terugbetalen);
    let payments = {};
    await Promise.all(terugbetalen.map(async t => {
      if (t.PaymentId) {
        if (!payments[t.PaymentId]) {
          payments[t.PaymentId] = 0;
        }
        t.prijs = await t.getPrijs();
        payments[t.PaymentId] += t.prijs.prijs;
      }
    }));

    await Promise.all(
      Object.keys(payments).map(async paymentId => {
        const amount = payments[paymentId];
        let payment = await Payment.findById(paymentId, {
          include: [Payment.Tickets]
        });
        const refunded = await payment.refund(amount);
        if (refunded) {
          await Promise.all(
            terugbetalen.map(async ticket => {
              ticket.terugbetalen = false;
              await ticket.save();
            })
          );
          await this.logMessage(`${payment.toString()}: ${amount} teruggestort`);
        }
      })
    );
  };

  Reservering.prototype.toString = function () {
    return this.sequelize.models.Ticket.description(this.Tickets);
  };

  Reservering.prototype.teruggeefbaar = async function () {
    const uitvoering = await this.getUitvoering();
    const today = new Date();
    const days = config.get("teruggave_termijn");
    const diff = await differenceInCalendarDays(uitvoering.aanvang, today)

    return diff > days;
  };

  Reservering.prototype.hasRefunds = async function () {
    const payments = await this.getPayments();
    return payments.find(p => p.refunds).length;
  };

  Reservering.verwerkRefunds = async function () {
    const Ticket = Reservering.sequelize.models.Ticket
    const reserveringen = await Reservering.findAll({
      include: [{
        model: Ticket,
        where: {
          terugbetalen: true
        },
        required: true
      }]
    })

    await Promise.all(reserveringen.map(async reservering => reservering.refund()))
  }

  Reservering.associate = function (models) {
    Reservering.Uitvoering = models.Reservering.belongsTo(models.Uitvoering, {
      onDelete: "RESTRICT",
      foreignKey: {
        allowNull: false
      }
    });

    Reservering.Tickets = models.Reservering.hasMany(models.Ticket);
    Reservering.Payments = models.Reservering.hasMany(models.Payment);
    Reservering.Logs = models.Reservering.hasMany(models.Log);
    Reservering.StatusUpdates = models.Reservering.hasMany(models.StatusUpdate);
  };

  return Reservering;
};