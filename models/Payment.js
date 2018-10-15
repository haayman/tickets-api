const config = require("config");
const mollie_key = config.get("payment.mollie_key");
const mollie = require("@mollie/api-client")({
  apiKey: mollie_key
});

module.exports = (sequelize, DataTypes) => {
  let Payment = sequelize.define(
    "Payment",
    {
      paymentId: { type: DataTypes.STRING },
      betaalstatus: { type: DataTypes.STRING }
    },
    {
      getterMethods: {
        isPaid() {
          return this.payment ? this.payment.isPaid() : false;
        },
        paymentUrl() {
          return this.payment ? this.payment.getPaymentUrl() : null;
        },
        amount() {
          return this.payment ? this.payment.amount.value : null;
        },
        refunds() {
          return this.payment ? this.payment.refunds() : null;
        },
        paidAt() {
          return this.payment ? this.payment.paidAt : null;
        }
      },
      hooks: {
        afterFind: () => this.initPayment
      },
      timestamps: true
    }
  );

  Payment.prototype.initPayment = async function() {
    if (!this.payment) {
      if (this.paymentId) {
        this.payment = await mollie.payments.get(this.paymentId);
      }
    }
  };

  Payment.prototype.setStatus = function() {
    this.betaalStatus = this.payment.status;

    if (this.payment.isPaid()) {
      this.tickets.array.forEach(ticket => {
        ticket.betaald = true;
      });
    }
  };

  Payment.prototype.status = {
    get: function() {
      return this.payment ? this.payment.status : null;
    },
    set: function(status) {
      this.setDataValue("status", status);

      switch (status) {
        case "refunded":
          {
            this.tickets.filter(t => t.tekoop).forEach(t => {
              t.verkocht = true;
            });
          }
          break;
        case "expired": {
          this.tickets.forEach(t => t.setPayment(null));
          this.tickets = [];
          break;
        }
      }
    }
  };

  Payment.prototype.setReservering = async function(reservering) {
    if (!this.getReservering()) {
      await Model.prototype.call(this, reservering); // parent setReservering() ??
      await Promise.all(
        reservering.onbetaaldeTickets.forEach(async t => {
          await ticket.setPayment(this);
        })
      );
      reservering.betaalStatus = this.payment.status;
    }
  };

  Payment.prototype.newPayment = async function(reservering) {
    const tickets = reservering.onbetaaldeTickets;
    this.payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (Ticket.totaalBedrag(tickets) * 100).toFixed(2)
      },
      description: Ticket.description(tickets),
      redirectUrl: reservering.redirectUrl(),
      webhookUrl: reservering.webhookUrl(),
      metadata: { reservering_id: reservering.id }
    });
    this.paymentId = this.payment.id;
    tickets.forEach(t => {
      ticket.addPayment(this);
    });
  };

  Payment.prototype.isRefundable = function(amount) {
    return (
      (amount != this.payment.amount &&
        this.payment.canBePartiallyRefunded()) ||
      (this.payment.canBeRefunded() &&
        this.payment.getAmountRemaining() >= amount)
    );
  };

  Payment.prototype.refund = async function(amount) {
    const result = await this.payment.refund({
      currency: "EUR",
      value: amount.toFixed(2)
    });
    return result;
  };

  Payment.prototype.setExpired = async function() {
    const reservering = await this.getReservering();
    const tickets = await this.getTickets();
    await Promise.all(
      tickets.forEach(async t => {
        await ticket.setPayment(null);
      })
    );
    await reservering.extraBetaling();
  };

  Payment.associate = function(models) {
    Payment.Reservering = models.Payment.belongsTo(models.Reservering, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
    Payment.Tickets = models.Payment.hasMany(models.Ticket);
  };

  return Payment;
};
