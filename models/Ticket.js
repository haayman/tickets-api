/*
  init: 'open',
  transitions: [
    name: 'betaal', from: 'open', to: 'betaald',
    name: 'annuleer', from ['betaald','open'] to 'geannuleerd',
    name: 'verkoop', from:'betaald', to: 'tekoop',
  ]

  'betaald'
  'geannuleerd'
  'tekoop'
  'terugtebetalen'
  'ibanonbekend'
  'ibanbekend'
  'terugbetaald'
  'verkocht'
*/
const TimestampedModel = require('./TimestampedModel');
const {
  Model
} = require('objection');

let _cache;

module.exports = class Ticket extends TimestampedModel {
  static get tableName() {
    return 'tickets';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        betaald: {
          type: 'boolean'
        },
        tekoop: {
          type: 'boolean'
        },
        geannuleerd: {
          type: 'boolean'
        },
        verkocht: {
          type: 'boolean'
        },
        terugbetalen: {
          type: 'boolean'
        },
      }
    }
  }

  static get virtualAttributes() {
    return {
      isPaid() {
        return this.payment && this.Payment.isPaid;
      }
    }
  }

  // ========= cache ====================

  static async getCache(force = false) {
    if (!_cache || force) {
      // _cache = await Ticket.query().eager('[prijs,reservering,payment]')
      _cache = await Ticket.query().eager('[prijs,payment]')
        .where({
          geannuleerd: false,
          verkocht: false,
          deletedAt: null
        });
    }

    return _cache;
  }

  async $afterGet(queryContext) {
    if (!this.payment) {
      this.payment = await this.$relatedQuery('payment');
    }
    if (!this.prijs) {
      this.prijs = await this.$relatedQuery('prijs');
    }
    // if (!this.reservering) {
    //   this.reservering = await this.$relatedQuery('reservering');
    // }
  }

  $afterDelete() {
    Ticket.getCache(true)
  }

  $afterInsert() {
    Ticket.getCache(true);
  }

  $afterUpdate() {
    Ticket.getCache(true);
  }
  // /========= cache ====================

  static get modifiers() {
    return {
      tekoop(builder) {
        builder.where('tekoop', '=', true)
      },
      valid(builder) {
        builder
          .where('geannuleerd', '=', false)
          .where('verkocht', '=', false)
      }
    }
  }

  toString() {
    return `1x ${this.prijs}`;
  }

  /**
   * Maak een beschrijving van een groep tickets
   * @param {*} tickets
   */
  async description(tickets) {
    // Tel aantal tickets per prijs
    const counter = {};
    await Promise.all(tickets.map(async t => {
      t.prijs = await t.getPrijs();
      if (!counter[t.prijs.id]) {
        counter[t.prijs.id] = {
          prijs: t.prijs,
          count: 0,
          bedrag: 0
        };
      }
      counter[t.prijs.id].count++;
    }));

    return Object.values(counter)
      .map(c => {
        const totaal = (c.count * c.prijs.prijs).toFixed(2);
        const count = c.count;
        return `${count}x ${c.prijs.asString()}: €${totaal}`;
      })
      .join("\n");
  }

  /**
   * bereken totaalbedrag over een set tickets
   * @param {*} tickets
   */
  static totaalBedrag(tickets) {
    return tickets.reduce((totaal, t) => totaal + t.prijs.prijs, 0);
  }


  /**
   * welke tickets staan te koop voor deze Uitvoering
   * @param {number} aantal 
   * @param {number} uitvoeringId
   * @return {Ticket[]}
   */
  static async tekoop(aantal, uitvoeringId = null) {
    const uitvoeringFilter = uitvoeringId !== null ? 'AND uitvoeringId=:uitvoering' : '';
    const sql = `SELECT * from Ticket
      WHERE reserveringId in (
        SELECT id from reservering WHERE 
          deletedAt IS NULL
          ${uitvoeringFilter}
        )
      AND tekoop=:tekoop
      ORDER BY updatedAt
      LIMIT ${aantal}`;

    const tickets = await Ticket.query().raw(sql, {
      model: Ticket,
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        tekoop: true,
        uitvoering: uitvoeringId
      }
    })
    return tickets
  }

  /**
   * Verkoop {aantal} tickets
   * @async
   * @param {number} aantal
   */

  static async verwerkTekoop(aantal, uitvoeringId = null) {
    const tekoop = await Ticket.tekoop(aantal, uitvoeringId);
    let verkocht = {};

    await Promise.all(tekoop.map(async (ticket) => {
      const reservering = await ticket.getReservering();
      verkocht[reservering.id] = reservering;

      ticket.verkocht = true;
      ticket.tekoop = false;
      ticket.terugbetalen = true;

      await ticket.save();
      const strTicket = await ticket.asString();
      await reservering.logMessage(`${strTicket} verkocht`);
    }))

    await Promise.all(
      Object.values(verkocht).map(async r => r.refund()));

    return tekoop.length;
  }

  static get relationMappings() {
    const Payment = require('./Payment');
    const Prijs = require('./Prijs');

    return {
      prijs: {
        relation: Model.BelongsToOneRelation,
        modelClass: Prijs,
        join: {
          from: 'tickets.prijsId',
          to: 'prijzen.id'
        }
      },
      payment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Payment,
        join: {
          from: 'tickets.paymentId',
          to: 'payments.id'
        }
      },
      // reservering: {
      //   relation: Model.BelongsToOneRelation,
      //   modelClass: Reservering,
      //   join: {
      //     from: 'ticket.reserveringId',
      //     to: 'reservering.id'
      //   }
      // }
    }
  };
};
