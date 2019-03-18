const config = require("config");
const mollie_key = config.get("payment.mollie_key");
const mollie = require("@mollie/api-client")({
  apiKey: mollie_key
});

module.exports = (sequelize, DataTypes) => {
  let Payment = sequelize.define(
    "Payment", {
      paymentId: {
        type: DataTypes.STRING
      },
      betaalstatus: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.STRING
      },
      paidBack: {
        type: DataTypes.DECIMAL(5, 2),
        default: 0
      }
    }, {
      paranoid: true, // zorgt er voor dat dit nooit echt verwijderd wordt
      getterMethods: {
        isPaid() {
          return this.payment ? this.payment.isPaid() : false;
        },
        paymentUrl() {
          return this.payment ? this.payment.getPaymentUrl() : null;
        },
        amount() {
          return this.payment ? +this.payment.amount.value : undefined;
        },
        amountRefunded() {
          return this.payment && this.payment.amountRefunded ?
            +this.payment.amountRefunded.value + this.paidBack :
            undefined;
        },
        // amountRemaining() {
        //   return this.payment && this.payment.amountRemaining ? +this.payment.amountRemaining.value : undefined;
        // },
        paidAt() {
          return this.payment ? this.payment.paidAt : undefined;
        },
        status() {
          return this.payment ? this.payment.status : undefined;
        },
        refundable() {
          return this.payment ? this.payment.isRefundable() : undefined;
        }
      },
      hooks: {
        afterFind: async function (payment) {
          if (!payment) {
            return;
          }
          if (payment.length !== undefined) {
            await Promise.all(payment.map(p => p.initPayment()));
          } else {
            await payment.initPayment();
          }
        }
      },
      timestamps: true
    }
  );

  Payment.prototype.initPayment = async function () {
    if (!this.payment) {
      if (this.paymentId) {
        this.payment = await mollie.payments.get(this.paymentId);
      }
    }
  };

  Payment.prototype.setStatus = async function () {
    this.betaalstatus = this.payment.status;
    await this.save()

    let reservering = await this.getReservering();
    await reservering.setStatus(this.betaalstatus);
    reservering.save();

    if (this.payment.isPaid()) {
      const tickets = await this.getTickets()
      await Promise.all(tickets.map(async ticket => {
        ticket.betaald = true;
        await ticket.save();
      }));
    }
  };

  Payment.prototype.tickets = async function () {
    const Ticket = this.sequelize.models.Ticket;
    if (!this._tickets) {
      this._tickets = await this.getTickets({
        include: [{
          association: Ticket.Prijs
        }]
      });
    }
    return this._tickets;
  }

  Payment.prototype.asString = async function () {
    const Ticket = Payment.sequelize.models.Ticket;
    if (!this.tickets) {
      this.tickets = await this.getTickets();
    }
    return Ticket.description(this.tickets);
  }

  Payment.prototype.status = {
    get: function () {
      return this.payment ? this.payment.status : null;
    },
    set: function (status) {
      this.setDataValue("status", status);

      switch (status) {
        case "refunded":
          {
            this.tickets.filter(t => t.tekoop).forEach(t => {
              t.verkocht = true;
              t.save();
            });
          }
          break;
        case "expired":
          {
            this.tickets.forEach(t => t.setPayment(null));
            this.setTickets([]);
            break;
          }
      }
    }
  };

  // Payment.prototype.setReservering = async function(reservering) {
  //   if (!this.getReservering()) {
  //     await Model.prototype.call(this, reservering); // parent setReservering() ??
  //     await Promise.all(
  //       reservering.onbetaaldeTickets.forEach(async t => {
  //         await ticket.setPayment(this);
  //       })
  //     );
  //     reservering.betaalStatus = this.payment.status;
  //   }
  // };

  // wordt aangeroepen vanuit Reservering.preSave()
  Payment.prototype.newPayment = async function (reservering) {
    const Ticket = this.sequelize.models.Ticket;
    const tickets = reservering.onbetaaldeTickets;
    const description = await Ticket.description(tickets);
    this.payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: Ticket.totaalBedrag(tickets).toFixed(2)
      },
      description: description,
      redirectUrl: reservering.redirectUrl,
      webhookUrl: reservering.webhookUrl,
      metadata: {
        reservering_id: reservering.id,
        payment_id: this.id
      }
    });

    this.paymentId = this.payment.id;
    this.description = description;
    await reservering.setStatus(this.payment.status);
    await reservering.save();
    await this.save(); // get id

    await Promise.all(tickets.map(async ticket => {
      ticket.PaymentId = this.id;
      // ticket.setPayment(this);
      await ticket.save();
    }));
  };

  Payment.prototype.refund = async function (amount) {
    const refund = await mollie.payments_refunds.create({
      paymentId: this.paymentId,
      amount: {
        currency: "EUR",
        value: amount.toFixed(2)
      }
    });
    return refund;
  };

  Payment.prototype.setExpired = async function () {
    const reservering = await this.getReservering();
    const tickets = await this.getTickets();
    await Promise.all(
      tickets.forEach(async t => {
        await ticket.setPayment(null);
      })
    );
    await reservering.extraBetaling();
  };

  Payment.associate = function (models) {
    Payment.Reservering = models.Payment.belongsTo(models.Reservering, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
    Payment.Tickets = models.Payment.hasMany(models.Ticket, {
      onDelete: 'CASCADE'
    });
  };

  return Payment;
};