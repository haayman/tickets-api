const config = require('config');

const TicketAggregate = require('./Ticket.Aggregate');
const Payment = require('./Payment');

const ReserveringMail = require("../components/ReserveringMail");

var differenceInCalendarDays = require('date-fns/difference_in_calendar_days');
const globalData = require('../components/globalData');
const iban = require('iban');
const BaseModel = require('./BaseModel');
const {
  Model
} = require('objection');
const uuid = require('uuid/v4');

module.exports = class Reservering extends BaseModel {
  static get tableName() {
    return 'reserveringen';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['naam', 'email'],
      properties: {
        id: {
          type: 'uuid'
        },
        naam: {
          type: 'string'
        },
        email: {
          type: 'string',
          format: 'email'
        },
        opmerking: {
          type: 'string'
        },
        opmerking_gebruiker: {
          type: 'string'
        },
        // status: {
        //   type: 'string'
        // },
        wachtlijst: {
          type: 'boolean'
        },
        ingenomen: {
          type: 'date-time'
        },
        bedrag: {
          type: 'number'
        },
        iban: {
          // @todo: validatie
          anyOf: [{
              type: 'string'
            },
            {
              type: 'null'
            }
          ]
        },
        tennamevan: {
          anyOf: [{
              type: 'string'
            },
            {
              type: 'null'
            }
          ]
        },
        uitvoeringId: {
          type: 'integer'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = uuid();
  }

  // set id(value) {
  //   console.log('SETID ==> ', value)
  //   this._id = value;
  // }
  // get id() {
  //   return this._id;
  // }

  toString() {
    return `${this.aantal}x ${this.uitvoering}`;
  }

  // ---------- virtual attributes --------------------------

  static get virtualAttributes() {
    return [
      'bedrag',
      'saldo',
      'openstaandBedrag',
      'validTickets',
      'tegoed',
      'aantal',
      'paymentUrl',
      'teruggeefbaar',
      'onbetaaldeTickets'
    ];
  }

  get bedrag() {
    // this.ticketAggregates: ticketAggregates
    return this.ticketAggregates ?
      this.ticketAggregates.reduce((bedrag, t) => bedrag + t.getBedrag(), 0) :
      undefined;
  }

  // dummy setter
  set bedrag(value) {
    //this.bedrag = value;
  }

  get saldo() {
    // bereken het totaal betaalde bedrag
    if (!this.payments) {
      return undefined;
    }

    // totaal betaald
    let saldo = this.payments.reduce((saldo, payment) => {
      if (!payment.payment && payment.paymentId) {
        debugger;
        throw new Error('payment not initialized');
      }
      if (payment.isPaid) {
        return saldo + (+payment.amount - (payment.amountRefunded || 0));
      } else {
        return saldo;
      }
    }, 0);

    // bereken kosten van alle te betalen tickets
    saldo = this.ticketAggregates.reduce((saldo, ta) => {
      return saldo - ta.getBedrag(ta.aantal - ta.aantaltekoop);
    }, saldo);

    return saldo;
  }

  get openstaandBedrag() {
    return -this.saldo;
  }

  get validTickets() {
    return this.tickets ?
      this.tickets.filter((t) => !(t.geannuleerd || t.verkocht)) :
      undefined;
  }

  /**
   * het bedrag dat teveel is betaald
   */
  get tegoed() {
    if (!this.validTickets) return undefined;

    return this.validTickets.reduce(
      (tegoed, ticket) => tegoed + ticket.tegoed,
      0
    );
  }

  /**
   * aantal gereserveerde plaatsen
   */
  get aantal() {
    return this.validTickets === undefined ?
      undefined :
      this.validTickets.length;
  }

  /**
   * Bepaal of de uitvoering binnen de teruggave_termijn valt
   */
  get teruggeefbaar() {
    if (!this.uitvoering) {
      return undefined;
    }
    const today = new Date();
    const days = config.get('teruggave_termijn');
    const diff = differenceInCalendarDays(this.uitvoering.aanvang, today);

    return diff > days;
  }

  get onbetaaldeTickets() {
    return this.validTickets !== undefined ?
      this.validTickets.filter((t) => !t.betaald) :
      undefined;
  }

  get moetInWachtrij() {
    if (!this.uitvoering) {
      return undefined;
    }
    const vrije_plaatsen = this.uitvoering.vrije_plaatsen(this.id);
    return vrije_plaatsen < this.aantal;
  }

  get hasRefunds() {
    if (!this.payments) {
      return undefined;
    }
    return this.payments.find((p) => p.refunds).length;
  }


  async haalUitWachtrij(trx) {
    this.wachtlijst = false;
    await this.$query(trx).patch({
      wachtlijst: false
    });
    await ReserveringMail.send(this, 'uit_wachtlijst', `uit wachtlijst`);
  }

  async logMessage(message) {
    throw new Error('deprecated. Gebruik Log.addMessage()');
  }

  get paymentUrl() {
    let url;
    if (this.payments === undefined) {
      return undefined;
    }
    let payment;
    if ((payment = this.payments.find((p) => p.paymentUrl))) {
      return payment.paymentUrl;
    }
    return undefined;
  }

  get newPaymentNeeded() {
    return (
      !this.wachtlijst &&
      this.onbetaaldeTickets.length &&
      this.payments.filter((p) => p.status == 'open').length == 0
    );
  }

  async createPaymentIfNeeded() {
    console.assert(this.tickets);
    console.assert(this.payments);

    if (this.newPaymentNeeded) {
      const payment = await Payment.newPayment(this);
      this.payments.push(payment);
    }
  }

  // interneVerkoop() {
  //   let tekoop = this.validTickets.filter(t => t.tekoop);
  //   if (this.saldo < 0 && tekoop.length) {
  //     let tegoed = -this.saldo;
  //     let tickets = this.onbetaaldeTickets();
  //     while (tegoed) {
  //       let ticket = tickets.find(t => t.prijs.prijs <= tegoed);
  //       if (ticket) {
  //         let verkocht = tekoop.find(t => t.prijs.prijs)
  //       }
  //     }
  //   }
  // }

  get isPaid() {
    if (!this.payments) {
      return undefined;
    }

    return this.payments.every((p) => p.isPaid);
  }

  getBetalingUrl() {
    return this.getRoot() + `/reserveren/${this.id}/betalen`;
  }

  getResendUrl() {
    return this.getRoot() + `/reserveren/${this.id}/resend`;
  }

  getEditLink() {
    return this.getRoot() + `/reserveren/${this.id}/edit`;
  }

  getTicketUrl() {
    return this.getRoot() + `/reserveren/${this.id}/details`;
  }

  getIBANUrl() {
    return this.getRoot() + `/reserveren/${this.id}/iban`;
  }

  getQrUrl() {
    return this.getWebhookRoot() + `/api/reservering/${this.id}/qr`;
  }

  getMailUrl() {
    return this.getRoot() + `/api/reservering/${this.id}/mail`;
  }

  get redirectUrl() {
    return this.getRoot() + '/api/payment/done/' + this.id;
  }

  get webhookUrl() {
    return this.getWebhookRoot() + '/api/payment/bank/' + this.id;
  }

  getRoot() {
    //return globalData.get("server");
    return config.get('server.url');
  }

  getWebhookRoot() {
    const root = globalData.get('localtunnel') ?
      globalData.get('localtunnel') :
      config.get('server.url');
    return root;
  }

  /**
   * zet status en voeg een status record toe
   */
  async setStatus(status, betaalstatus = true) {
    await this.$query().patch({
      status: status
    });
    await this.$relatedQuery('statusupdates').insert({
      status: status,
      betaalstatus: betaalstatus,
      reserveringId: this.id
    });
    this.status = status;
  }

  // /---------- virtual attributes --------------------------

  $afterGet(queryContext) {
    // niet achteraf doen. Zorg er voor dat 't in de route allemaal geladen is
    // await this.$loadRelated('[uitvoering.voorstelling.prijzen,payments,tickets]');

    // dit zou toch allemaal overbodig moeten zijn?

    // let payments = {};
    // this.payments.forEach((p) => payments[p.id] = p);

    // if (!this.ticketAggregates) {
    //   this.tickets.forEach(t => {
    //     t.payment = payments[t.paymentId];
    //   })
    // }

    if (this.uitvoering) {
      this.ticketAggregates = TicketAggregate.factory(
        this,
        this.uitvoering,
        this.tickets
      );
    }
    return this;
  }

  $formatJson(json) {
    json = super.$formatJson(json);
    json.tickets = this.ticketAggregates;
    delete json.ticketAggregates;
    delete json.validTickets;
    // json.paymentUrl = this.paymentUrl
    return json;
  }

  static get relationMappings() {
    const Uitvoering = require('./Uitvoering');
    const Ticket = require('./Ticket');
    const Payment = require('./Payment');
    const Log = require('./Log');
    const StatusUpdate = require('./StatusUpdate');

    return {
      uitvoering: {
        relation: Model.BelongsToOneRelation,
        modelClass: Uitvoering,
        join: {
          from: 'reserveringen.uitvoeringId',
          to: 'uitvoeringen.id'
        }
      },
      tickets: {
        relation: Model.HasManyRelation,
        modelClass: Ticket,
        join: {
          from: 'tickets.reserveringId',
          to: 'reserveringen.id'
        }
      },
      logs: {
        relation: Model.HasManyRelation,
        modelClass: Log,
        join: {
          from: 'logs.reserveringId',
          to: 'reserveringen.id'
        }
      },
      payments: {
        relation: Model.HasManyRelation,
        modelClass: Payment,
        join: {
          from: 'payments.reserveringId',
          to: 'reserveringen.id'
        }
      },
      statusupdates: {
        relation: Model.HasManyRelation,
        modelClass: StatusUpdate,
        join: {
          from: 'statusupdates.reserveringId',
          to: 'reserveringen.id'
        }
      }
    };
  }

  static getStandardEager() {
    return '[uitvoering.voorstelling.prijzen,tickets.[payment,prijs],payments]'
  }
};
