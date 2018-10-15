const { Payment } = require("./index");

const config = require("config");

const moment = require("moment");

module.exports = (sequelize, DataTypes) => {
  let Reservering = sequelize.define(
    "Reservering",
    {
      naam: { type: DataTypes.STRING, allowUnknown: false },
      email: {
        type: DataTypes.STRING,
        allowUnknown: false,
        validate: { isEmail: true }
      },
      opmerking: { type: DataTypes.STRING },
      opmerking_gebruiker: { type: DataTypes.STRING },
      status: { type: DataTypes.STRING },
      wachtlijst: { type: DataTypes.BOOLEAN },
      bedrag: { type: DataTypes.DECIMAL(5, 2) }
    },
    {
      name: {
        singular: "reservering",
        plural: "reserveringen"
      },
      timestamps: true,
      getterMethods: {
        bedrag() {
          return this.tickets.reduce((bedrag, t) => bedrag + t.getBedrag(), 0);
        },
        saldo() {
          // bereken het totaal betaalde bedrag
          let saldo = this.payments.reduce((saldo, payment) => {
            if (payment.isPaid) {
              return saldo + (payment.amount - payment.amountRefunded);
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
          return this.tickets
            ? this.tickets.reduce((validTickets, ticket) => {
                return validTickets.concat(ticket.validTickets);
              }, [])
            : [];
        },

        async moetInWachtrij() {
          const vrije_plaatsen = await this.uitvoering.getVrijePlaatsen(
            this.id
          );
          return vrije_plaatsen <= 0;
        },

        /**
         * het bedrag dat teveel is betaald
         */

        tegoed() {
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

          for (let payment of this.getDataValue(payments)) {
            if (!payment.isPaid) {
              return false;
            } else {
              retval = true;
            }
          }
          return retval;
        },

        redirectUrl() {
          return config.get("server.url") + "/api/payment/done/" + this.id;
        },

        webhookUrl() {
          return config.get("server.url") + "/api/payment/bank/" + this.id;
        }
      },

      hooks: {
        beforeSave: async function(reservering) {
          if (reservering.onbetaaldeTickets.length) {
            const payment = Payment.build({
              tickets: reservering.onbetaaldeTickets
            });
            await payment.newPayment(reservering);
            await payment.save();
            reservering.addPayment(payment);
          }
        }
      }
    }
  );

  Reservering.prototype.paymentUrl = async function() {
    let url;
    for (let payment of this.payments) {
      if ((url = await payment.paymentUrl)) {
        return url;
      }
    }
    return null;
  };

  Reservering.prototype.extraBetaling = async function() {
    const payment = Payment.create();

    // hier wordt automatisch een nieuw payment + bedrag aangemaakt
    await payment.setReservering(this);

    return payment;
  };

  Reservering.prototype.haalUitWachtrij = async function() {
    this.wachtlijst = false;
    await this.save();
    //  ReserveringMail::send(this, 'uit_wachtlijst');
  };

  Reservering.prototype.logMessage = function(message) {
    // if( user = Application.getUser()) {
    //   message += ` (door ${user.name})`;
    // }

    const log = this.sequalize.models.Log.create({
      message,
      reserveringId: this.id
    });
  };

  Reservering.prototype.refund = async function() {
    const tekoop = this.validTickets.filter(t => t.tekoop);
    let payments = {};
    tekoop.forEach(t => {
      if (t.paymentId) {
        if (!payments[t.paymentId]) {
          payments[t.paymentId] = 0;
        }
        payments[t.paymentId] += t.prijs.prijs;
      }
    });

    await Promise.all(
      Object.keys.forEach(async paymentId => {
        const amount = payments[paymentId];
        let payment = await Payment.findById(paymentId);
        if (payment.refund(amount)) {
          await Promise.all(
            tekoop.forEach(async ticket => {
              ticket.verkocht = true;
              ticket.save();
            })
          );
        }
      })
    );
  };

  Reservering.prototype.toString = function() {
    return Ticket.description(this.tickets);
  };

  Reservering.prototype.teruggeefbaar = async function() {
    const uitvoering = await this.getUitvoering();
    const date = moment(uitvoering.aanvang);
    const today = moment(new Date());
    const duration = moment.duration(today.diff(date));
    const days = config.get("teruggave_termijn");

    return duration.asDays() > days;
  };

  Reservering.prototype.hasRefunds = async function() {
    const payments = await this.getPayments();
    return payments.find(p => p.refunds).length;
  };

  Reservering.associate = function(models) {
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
