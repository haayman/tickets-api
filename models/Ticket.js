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
const REFRESH_CACHE = 5 // minutes
const BaseModel = require('./BaseModel');
const Log = require('./Log');

const {
  Model
} = require('objection');

let _cache;
let _dirty = true;
let latest_trx = null;

module.exports = class Ticket extends BaseModel {
  static get tableName() {
    return 'tickets';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        id: {
          type: 'integer'
        },
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
        paymentId: {
          type: 'integer'
        },
        reserveringId: {
          type: 'uuid'
        },
        prijsId: {
          type: 'integer'
        }
      }
    };
  }

  static get virtualAttributes() {
    return ['isPaid'];
  }

  isPaid() {
    return this.payment && this.payment.isPaid;
  }

  /**
   * virtual attributes negeren
   * @param {*} json
   * @param {*} opt
   */
  $parseJson(json, opt) {
    json = super.$parseJson(json, opt);

    Ticket.virtualAttributes.forEach((a) => {
      delete json[a];
    });
    return json;
  }

  // voorkom recursie
  $formatJson(json) {
    delete json.reservering;
    // delete json.ticket; // 
    return json;
  }

  // ========= cache ====================

  static async getCache(trx) {
    // if (!_cache || _dirty) {
    // _cache = await Ticket.query().eager('[prijs,reservering,payment]')
    // console.log('refresh Ticket cache');
    _cache = await Ticket.query(trx)
      .eager('[prijs,payment,reservering]')
      .where({
        geannuleerd: false,
        verkocht: false,
        deletedAt: null
      });
    _dirty = false;
    // }

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
    _dirty = true;
    // Ticket.getCache();
  }

  $afterInsert() {
    _dirty = true;
    // Ticket.getCache();
  }


  $afterUpdate() {
    _dirty = true;
    // Ticket.getCache();
  }
  // /========= cache ====================

  static get modifiers() {
    return {
      tekoop(builder) {
        builder.where('tekoop', '=', true);
      },
      valid(builder) {
        builder.where('geannuleerd', '=', false).where('verkocht', '=', false);
      }
    };
  }

  toString() {
    return `1x ${this.prijs}`;
  }

  /**
   * Maak een beschrijving van een groep tickets
   * @param {*} tickets
   */
  static description(tickets) {
    // Tel aantal tickets per prijs
    const counter = {};
    // await Promise.all(tickets.map(async t => {
    tickets.forEach((t) => {
      // t.prijs = await t.getPrijs();
      if (!counter[t.prijs.id]) {
        counter[t.prijs.id] = {
          prijs: t.prijs,
          count: 0,
          bedrag: 0
        };
      }
      counter[t.prijs.id].count++;
    });

    return Object.values(counter)
      .map((c) => {
        const totaal = (c.count * c.prijs.prijs).toFixed(2);
        const count = c.count;
        return `${count}x ${c.prijs}: €${totaal}`;
      })
      .join('\n');
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
  static async tekoop(trx, aantal, uitvoeringId = null) {
    let tickets = await Ticket.getCache(trx, true);
    tickets = tickets.filter(t => t.tekoop).sort((a, b) => a.updatedAt - b.updatedAt)
    if (uitvoeringId) {
      tickets = tickets.filter(t => t.reservering.uitvoeringId == uitvoeringId);
    }

    // const uitvoeringFilter =
    //   uitvoeringId !== null ? 'AND uitvoeringId=:uitvoering' : '';
    // const sql = `SELECT * from Ticket
    //   WHERE reserveringId in (
    //     SELECT id from reservering WHERE 
    //       deletedAt IS NULL
    //       ${uitvoeringFilter}
    //     )
    //   AND tekoop=:tekoop
    //   ORDER BY updatedAt
    //   LIMIT ${aantal}`;

    // const tickets = await Ticket.query().raw(sql, {
    //   model: Ticket,
    //   type: sequelize.QueryTypes.SELECT,
    //   replacements: {
    //     tekoop: true,
    //     uitvoering: uitvoeringId
    //   }
    // });
    return tickets.slice(0, aantal);
  }

  /**
   * Verkoop {aantal} tickets
   * @async
   * @param {number} aantal
   */

  static async verwerkTekoop(trx, aantal, uitvoeringId = null) {
    const tekoop = await Ticket.tekoop(trx, aantal, uitvoeringId);
    let verkocht = {};

    await Promise.all(
      tekoop.map(async (ticket) => {
        const reservering = ticket.reservering;
        verkocht[reservering.id] = reservering;

        ticket.verkocht = true;
        ticket.tekoop = false;
        ticket.terugbetalen = true;

        await ticket.$query(trx).patch({
          verkocht: true,
          tekoop: false,
          terugbetalen: true
        });
        await Log.addMessage(reservering, `${ticket} verkocht`, trx);
      })
    );
  }

  static get relationMappings() {
    const Payment = require('./Payment');
    const Prijs = require('./Prijs');
    const Reservering = require('./Reservering');

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
      reservering: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reservering,
        join: {
          from: 'tickets.reserveringId',
          to: 'reserveringen.id'
        }
      }
    };
  }
};
