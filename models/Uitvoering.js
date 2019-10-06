const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const BaseModel = require('./BaseModel');
const {
  Model,
  raw
} = require('objection');
const Ticket = require('./Ticket');
const Reservering = require('./Reservering');

module.exports = class Uitvoering extends BaseModel {
  static get tableName() {
    return 'uitvoeringen';
  };

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['aanvang', 'deur_open', 'aantal_plaatsen'],
      properties: {

        id: {
          type: 'integer'
        },
        aanvang: {
          type: 'datetime'
        },
        deur_open: {
          type: 'datetime'
        },
        extra_text: {
          type: 'string'
        },
        aantal_plaatsen: {
          type: 'integer',
          'min': 1
        },
        voorstellingId: {
          type: 'integer'
        }
      }
    }
  }


  static get virtualAttributes() {
    return ['gereserveerd', 'wachtlijst', 'tekoop', 'vrije_plaatsen'];
  }

  $formatJson(json) {
    let retval = super.$formatJson(json);
    delete retval.myTickets;

    return retval;
  }

  $parseJson(json, opt) {
    json = super.$parseJson(json, opt);

    ['aanvang', 'deur_open'].forEach(column => {
      if (json[column] && typeof json[column] == 'string') {
        json[column] = new Date(json[column]);
      }
    })

    Uitvoering.virtualAttributes.forEach(a => {
      delete json[a];
    })
    return json;
  }

  async getTickets(trx) {
    const tickets = await Ticket.getCache(trx);
    this.myTickets = tickets.filter(t => t.reservering.uitvoeringId == this.id);
  }

  /**
   * na het lezen lijst met tickets uit de cache 
   */
  async $afterGet() {
    await this.getTickets();
  }

  gereserveerd(reservering_id = 0) {
    const gereserveerd = this.countTickets({
      wachtlijst: false,
      reservering_id: reservering_id
    });
    return gereserveerd;
  };

  wachtlijst(reservering_id = null) {
    const wachtlijst = this.countTickets({
      wachtlijst: true,
      reservering_id: reservering_id
    });
    return wachtlijst;
  };

  tekoop() {
    const tekoop = this.countTickets({
      tekoop: true
    })
    return tekoop;
  }

  vrije_plaatsen(reservering_id = null) {
    return Math.max(this.aantal_plaatsen - this.gereserveerd(reservering_id) + this.tekoop(), 0);
  }

  countTickets(options) {
    let tickets = this.myTickets;

    if (options.tekoop !== undefined) {
      tickets = tickets.filter(t => !!t.tekoop == !!options.tekoop);
    }

    if (options.reservering_id) {
      tickets = tickets.filter(t => t.reserveringId !== options.reservering_id);
    }
    if (options.wachtlijst !== undefined) {
      tickets = tickets.filter(t => !!t.reservering.wachtlijst == !!options.wachtlijst);
    }

    return tickets.length;
  };

  async wachtenden(trx, maxAantal) {
    const wachtenden = await this.$relatedQuery('reserveringen', trx)
      .eager(Reservering.getStandardEager())
      .where('wachtlijst', true)
      .orderBy('createdAt')
      .limit(maxAantal);
    return wachtenden;
  };

  async vrijgekomen(trx) {

    let gelukkigen = [];
    let vrije_plaatsen = this.vrije_plaatsen();
    const wachtenden = await this.wachtenden(trx, vrije_plaatsen);
    wachtenden.forEach(w => {
      if (w.aantal <= vrije_plaatsen) {
        vrije_plaatsen -= w.aantal;
        gelukkigen.push(w);
      }
    });
    return gelukkigen;
  };

  /**
   * 
   * @param {Ticket} Ticket (zorgt er voor dat we binnen een transactie blijven)
   */
  async verwerkWachtlijst(trx) {
    // er zijn mogelijk wijzigingen geweest in wachtlijsten. Ververs
    await this.getTickets(trx);

    const vrijgekomen = await this.vrijgekomen(trx);
    let aantalTickets = 0;
    await Promise.all(vrijgekomen.map(gelukkige => {
      aantalTickets += gelukkige.aantal;
      return gelukkige.haalUitWachtrij(trx);
    }));
    await Ticket.verwerkTekoop(trx, aantalTickets);
  };

  toString() {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text || ''} ${format(this.aanvang, 'dddd D MMM HH:mm', { locale: nl })}`;

  }

  get status() {
    const wachtlijst = this.wachtlijst();
    const vrije_plaatsen = this.vrije_plaatsen();
    const tekoop = this.tekoop();
    let retval;

    if (vrije_plaatsen) {
      retval = `<span>${vrije_plaatsen} vrije plaats${vrije_plaatsen == 1 ? '' : 'en'}</span>`
    } else {
      retval = `<b>Uitverkocht</b>`;
    }

    if (!vrije_plaatsen || wachtlijst) {
      retval += ` <span>wachtlijst: ${wachtlijst || 0}</span>`;
    }
    if (tekoop) {
      retval += ` te koop: ${tekoop}`;
    }

    return retval;
  }


  static get relationMappings() {
    const Reservering = require('./Reservering');
    const Voorstelling = require('./Voorstelling');

    return {
      voorstelling: {
        relation: Model.BelongsToOneRelation,
        modelClass: Voorstelling,
        join: {
          from: 'voorstellingen.id',
          to: 'uitvoeringen.voorstellingId'
        }
      },
      reserveringen: {
        relation: Model.HasManyRelation,
        modelClass: Reservering,
        join: {
          from: 'reserveringen.uitvoeringId',
          to: 'uitvoeringen.id'
        }
      }
    }
  }
}
