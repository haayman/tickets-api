const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const TimestampedModel = require('./TimestampedModel');
const {
  Model,
  raw
} = require('objection');
const Ticket = require('./Ticket');

module.exports = class Uitvoering extends TimestampedModel {
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
        }
      }
    }
  }

  async getVrijePlaatsen(reservering_id = 0) {
    const gereserveerd = await this.getGereserveerd(reservering_id);
    const tekoop = await this.getTekoop();
    return this.aantal_plaatsen - gereserveerd + tekoop;
  }


  // Uitvoering.prototype.getIncludes = async function () {
  //   this.voorstelling = await this.getVoorstelling();
  // };

  static get virtualAttributes() {
    return ['gereserveerd', 'wachtlijst', 'tekoop', 'vrije_plaatsen'];
  }

  async toJSONA() {
    let obj = this.toJSON();
    obj.gereserveerd = await this.getGereserveerd();
    obj.wachtlijst = await this.getWachtlijst();
    obj.tekoop = await this.getTekoop();
    obj.vrije_plaatsen = Math.max(obj.aantal_plaatsen - obj.gereserveerd, 0);

    return obj;
  };

  $formatJson(json) {
    let retval = super.$formatJson(json);
    delete retval.myTickets;

    return retval;
  }

  async $afterGet() {
    const tickets = await Ticket.getCache();
    this.myTickets = tickets.filter(t => t.reservering.uitvoeringId == this.id);
  }

  gereserveerd(reservering_id = 0) {
    const gereserveerd = this.countTickets({
      wachtlijst: false,
      reservering_id: reservering_id
    });
    return gereserveerd;
  };

  wachtlijst(reservering_id = 0) {
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

  vrije_plaatsen() {
    return Math.max(this.aantal_plaatsen - this.gereserveerd(), 0);
  }

  countTickets(options) {
    let tickets = this.myTickets;

    if (options.tekoop) {
      tickets = tickets.filter(t => t.tekoop !== !!options.tekoop);
    }

    if (options.reservering_id) {
      tickets = tickets.filter(t => t.reserveringId !== options.reservering_id);
    }
    if (options.wachtlijst) {
      tickets = tickets.filter(t => t.wachtlijst != !!options.wachtlijst);
    }

    return tickets.length;
  };

  async wachtenden() {
    const wachtenden = await this.getReserveringen({
      where: {
        wachtlijst: true
      },
      order: ["createdAt"]
    });
    return wachtenden;
  };

  async vrijgekomen() {
    let gelukkigen = [];
    let vrije_plaatsen = await this.getVrijePlaatsen();
    const wachtenden = await this.wachtenden();
    wachtenden.forEach(w => {
      if (w.aantal <= vrije_plaatsen) {
        vrije_plaatsen -= w.aantal;
        gelukkigen.push(w);
      }
    });
    return gelukkigen;
  };

  async verwerkWachtlijst() {
    const vrijgekomen = await this.vrijgekomen();
    let aantalTickets = 0;
    await Promise.all(vrijgekomen.map(gelukkige => {
      aantalTickets += gelukkige.aantal;
      return gelukkige.haalUitWachtrij();
    }));
    const Ticket = Uitvoering.sequelize.models.Ticket;
    await Ticket.verwerkTekoop(aantalTickets, this.id);
  };

  toString() {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text || ''} ${format(this.aanvang, 'dddd D MMM HH:mm', { locale: nl })}`;

  }

  async status() {
    const gereserveerd = await this.getGereserveerd();
    const wachtlijst = await this.getWachtlijst();
    const vrije_plaatsen = this.aantal_plaatsen - gereserveerd;
    const tekoop = await this.getTekoop();
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
    // const Reservering = require('./Reservering');
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
      // reserveringen: {
      //   relation: Model.HasManyRelation,
      //   modelClass: Reservering,
      //   join: {
      //     from: 'reserveringen.uitvoeringId',
      //     to: 'uitvoeringen.id'
      //   }
      // }
    }
  }
}

// // scopes ---------------------------

// models.Uitvoering.addScope('defaultScope', {
//   include: [{
//     model: models.Voorstelling,
//     where: {
//       active: true
//     }
//   }]
// }, {
//   override: true
// })
