const { createMollieClient } = require("@mollie/api-client");
const BaseModel = require("./BaseModel");
const { Model } = require("objection");
const config = require("config");
const mollie_key = config.get("payment.mollie_key");

const mollie = createMollieClient({ apiKey: mollie_key });

module.exports = class Payment extends BaseModel {
  static get tableName() {
    return "payments";
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: {
          type: "integer",
        },
        paymentId: {
          type: "string",
        },
        betaalstatus: {
          type: "string",
        },
        description: {
          type: "string",
        },
        paidBack: {
          type: "number",
        },
        reserveringId: {
          type: "uuid",
        },
      },
    };
  }

  static get virtualAttributes() {
    return ["isPaid", "amount", "paymentUrl", "amountRefunded", "paidAt", "status", "refundable"];
  }

  // --------- virtual attributes -----------
  get paymentUrl() {
    return this.payment.getPaymentUrl();
    // return this.payment ? this.payment.getPaymentUrl() : null;
  }

  get amount() {
    return this.payment ? +this.payment.amount.value : undefined;
  }

  get amountRefunded() {
    return this.payment && this.payment.amountRefunded
      ? +this.payment.amountRefunded.value + this.paidBack
      : undefined;
  }
  // amountRemaining() {
  //   return this.payment && this.payment.amountRemaining ? +this.payment.amountRemaining.value : undefined;
  // },
  get paidAt() {
    return this.payment ? this.payment.paidAt : undefined;
  }
  get status() {
    return this.payment ? this.payment.status : undefined;
  }
  get refundable() {
    return this.payment ? this.payment.isRefundable() : undefined;
  }

  get isPaid() {
    return this.payment ? this.payment.isPaid() : undefined;
  }

  // laad altijd de Mollie payment er bij
  async $afterGet(queryContext) {
    await this.initPayment();
  }

  async getReservering() {
    const reservering = this.reservering || (await this.$relatedQuery("reservering"));
    return reservering;
  }

  async getTickets() {
    const tickets = this.tickets || (await this.$relatedQuery("tickets"));
    return tickets;
  }

  async initPayment() {
    if (!this.payment) {
      if (this.paymentId) {
        this.payment = await mollie.payments.get(this.paymentId);
      }
    }
  }

  // voorkom recursie
  $formatJson(json) {
    delete json.payment; // mollie payment niet terugsturen
    return json;
  }

  async setStatus() {
    this.betaalstatus = this.payment.status;
    await this.$query().patch({
      betaalstatus: this.betaalstatus,
    });

    let reservering = await this.getReservering();
    await reservering.setStatus(this.betaalstatus);

    if (this.payment.isPaid()) {
      const tickets = await this.getTickets();
      await Promise.all(
        tickets.map(async (ticket) => {
          ticket.betaald = true;
          await ticket.save();
        }),
      );
    }
  }

  // async tickets() {
  //   const Ticket = require('./Ticket');
  //   if (!this._tickets) {
  //     this._tickets = await this.getTickets({
  //       include: [{
  //         association: Ticket.Prijs
  //       }]
  //     });
  //   }
  //   return this._tickets;
  // }

  async asString() {
    const Ticket = require("./Ticket");
    if (!this.tickets) {
      this.tickets = await this.getTickets();
    }
    return Ticket.description(this.tickets);
  }

  toString() {
    return `${this.paymentId} ${this.description}`;
  }

  get status() {
    return this.payment ? this.payment.status : null;
  }

  set status(status) {
    // @todo dit werkt niet
    this.setDataValue("status", status);

    switch (status) {
      case "refunded":
        {
          this.tickets
            .filter((t) => t.tekoop)
            .forEach((t) => {
              t.verkocht = true;
              t.save();
            });
        }
        break;
      case "expired": {
        this.tickets.forEach((t) => t.setPayment(null));
        this.setTickets([]);
        break;
      }
    }
  }

  // PaymentFactory
  // wordt aangeroepen vanuit Reservering.createPaymentIfNeeded()
  static async newPayment(reservering) {
    const Ticket = require("./Ticket");

    const tickets = reservering.onbetaaldeTickets;

    // create a description for this set of tickets
    const description = await Ticket.description(tickets);

    // request a new Mollie payment
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: Ticket.totaalBedrag(tickets).toFixed(2),
      },
      description: description,
      redirectUrl: reservering.redirectUrl,
      webhookUrl: reservering.webhookUrl,
      metadata: {
        reservering_id: reservering.id,
      },
    });

    // add the status
    await reservering.setStatus(payment.status);

    // insert a new Payment record
    let newPayment = await reservering.$relatedQuery("payments").insert({
      paymentId: payment.id,
      description: description,
    });
    newPayment.payment = payment;

    // attach the newly created Payment to all these tickets
    await Promise.all(
      tickets.map(async (ticket) => {
        ticket.PaymentId = newPayment.id;
        // ticket.setPayment(this);
        await ticket.$query().update(ticket);
      }),
    );

    return newPayment;
  }

  async refund(amount) {
    const refund = await mollie.payments_refunds.create({
      paymentId: this.paymentId,
      amount: {
        currency: "EUR",
        value: amount.toFixed(2),
      },
    });
    return refund;
  }

  // async setExpired() {
  //   const reservering = await this.getReservering();
  //   const tickets = await this.getTickets();
  //   await Promise.all(
  //     tickets.forEach(async t => {
  //       await ticket.setPayment(null);
  //     })
  //   );
  //   await reservering.extraBetaling();
  // };

  static get relationMappings() {
    const Reservering = require("./Reservering");
    const Ticket = require("./Ticket");

    return {
      reservering: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reservering,
        join: {
          from: "payments.reserveringId",
          to: "reserveringen.id",
        },
      },
      tickets: {
        relation: Model.HasManyRelation,
        modelClass: Ticket,
        join: {
          from: "tickets.paymentId",
          to: "payments.id",
        },
      },
    };
  }
};
