const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')
const TimestampedModel = require('./TimestampedModel');
const {
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

  // Uitvoering.prototype.toJSONA = async function () {
  //   let obj = this.toJSON();
  //   obj.gereserveerd = await this.getGereserveerd();
  //   obj.wachtlijst = await this.getWachtlijst();
  //   obj.tekoop = await this.getTekoop();
  //     obj.vrije_plaatsen = Math.max(obj.aantal_plaatsen - obj.gereserveerd,0);

  //   return obj;
  // };

  async getGereserveerd(reservering_id = 0) {
    const gereserveerd = await this.countTickets({
      wachtlijst: false,
      reservering_id: reservering_id
    });
    return gereserveerd;
  };

  async getWachtlijst(reservering_id = 0) {
    const wachtlijst = await this.countTickets({
      wachtlijst: true,
      reservering_id: reservering_id
    });
    return wachtlijst;
  };

  async getTekoop() {
    const tekoop = await this.countTickets({
      tekoop: true
    })
    return tekoop;
  }

  async countTickets(options) {
    let query = Ticket.query()
      .select('count(*) as count')
      .where('verkocht', '=', false)
      .where('geannuleerd', '=', 'false')
      .where('deletedAt', '=', null)
    if (options.tekoop) {
      query = query.where('tekoop', '=', !!options.tekoop);
    }

    let reserveringQuery = Reservering.query()
      .select('id')
      .where('uitvoeringId', '=', this.id)

    query = query.whereIn('reserveringId', reserveringQuery);

    if (options.reservering_id) {
      reserveringQuery = qureserveringQueryery.where('id', '!=', options.reservering_id);
    }
    if (options.wachtlijst) {
      reserveringQuery = reserveringQuery.where('wachtlijst', '=', !!options.wachtlijst);
    }

    const result = await query;

    // let sql = `select count(*) as count from Ticket where verkocht=:verkocht 
    //   and geannuleerd=:geannuleerd and 
    //   deletedAt IS NULL
    //   ${tekoopClause}
    //   AND reserveringId IN (select id from Reservering where 
    //     uitvoeringId = :uitvoeringId 
    //     AND deletedAt IS NULL
    //     ${wachtlijstClause}
    //     ${reserveringClause} 
    //   )`;

    // const [result] = await this.query(sql, {
    //   replacements: {
    //     verkocht: false,
    //     geannuleerd: false,
    //     uitvoeringId: this.id,
    //     wachtlijst: !!options.wachtlijst,
    //     reservering_id: options.reservering_id,
    //     tekoop: !!options.tekoop
    //   },
    //   type: sequelize.QueryTypes.SELECT
    // });

    return result.count;
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
