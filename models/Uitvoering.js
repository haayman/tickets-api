const format = require('date-fns/format');
const nl = require('date-fns/locale/nl')

module.exports = (sequelize, DataTypes) => {
  let Uitvoering = sequelize.define(
    "Uitvoering", {
      aanvang: {
        type: DataTypes.DATE,
        allowNull: false
      },
      deur_open: {
        type: DataTypes.DATE,
        allowNull: false
      },
      extra_text: {
        type: DataTypes.STRING,
        allowNull: true
      },
      aantal_plaatsen: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      }
    }, {
      name: {
        singular: "uitvoering",
        plural: "uitvoeringen"
      },
      hooks: {
        // afterFind: async function (uitvoering) {
        //   if (uitvoering.length !== undefined) {
        //     return Promise.all(uitvoering.map(async t => t.getIncludes()));
        //   } else {
        //     return uitvoering.getIncludes();
        //   }
        // }
      }
    }
  );

  Uitvoering.prototype.getIncludes = async function () {
    this.voorstelling = await this.getVoorstelling();
  };

  Uitvoering.prototype.toJSONA = async function () {
    let obj = this.toJSON();
    obj.gereserveerd = await this.getGereserveerd();
    obj.wachtlijst = await this.getWachtlijst();
    obj.tekoop = await this.getTekoop();
      obj.vrije_plaatsen = Math.max(obj.aantal_plaatsen - obj.gereserveerd,0);

    return obj;
  };

  Uitvoering.prototype.getVrijePlaatsen = async function (reservering_id = 0) {
    const gereserveerd = await this.getGereserveerd(reservering_id);
    const tekoop = await this.getTekoop();
    return this.aantal_plaatsen - gereserveerd + tekoop;
  };

  Uitvoering.prototype.getGereserveerd = async function (reservering_id = 0) {
    const gereserveerd = await this.countTickets({
      wachtlijst: false,
      reservering_id: reservering_id
    });
    return gereserveerd;
  };

  Uitvoering.prototype.getWachtlijst = async function (reservering_id = 0) {
    const wachtlijst = await this.countTickets({
      wachtlijst: true,
      reservering_id: reservering_id
    });
    return wachtlijst;
  };

  Uitvoering.prototype.getTekoop = async function () {
    const tekoop = await this.countTickets({ tekoop: true })
    return tekoop;
  }

  Uitvoering.prototype.countTickets = async function (options) {
    const reserveringClause = options.reservering_id ?
      " and id != :reservering_id" :
      "";
    const wachtlijstClause = options.wachtlijst !== undefined ? "AND wachtlijst = :wachtlijst" : "";
    const tekoopClause = options.tekoop ? "AND tekoop = :tekoop" : "";

    let sql = `select count(*) as count from Ticket where verkocht=:verkocht 
      and geannuleerd=:geannuleerd and 
      deletedAt IS NULL
      ${tekoopClause}
      AND reserveringId IN (select id from Reservering where 
        uitvoeringId = :uitvoeringId 
        AND deletedAt IS NULL
        ${wachtlijstClause}
        ${reserveringClause} 
      )`;

    const [result] = await sequelize.query(sql, {
      replacements: {
        verkocht: false,
        geannuleerd: false,
        uitvoeringId: this.id,
        wachtlijst: !!options.wachtlijst,
        reservering_id: options.reservering_id,
        tekoop: !!options.tekoop
      },
      type: sequelize.QueryTypes.SELECT
    });

    return result.count;
  };

  Uitvoering.prototype.wachtenden = async function () {
    const wachtenden = await this.getReserveringen({
      where: {
        wachtlijst: true
      },
      order: ["createdAt"]
    });
    return wachtenden;
  };

  Uitvoering.prototype.vrijgekomen = async function () {
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

  /**
   * @async
   */
  Uitvoering.prototype.verwerkWachtlijst = async function () {
    const vrijgekomen = await this.vrijgekomen();
    let aantalTickets = 0;
    await Promise.all(vrijgekomen.map(gelukkige => {
      aantalTickets += gelukkige.aantal;
      return gelukkige.haalUitWachtrij();
    }));
    const Ticket = Uitvoering.sequelize.models.Ticket;
    await Ticket.verwerkTekoop(aantalTickets, this.id);
  };

  Uitvoering.prototype.toString = function () {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text || ''} ${format(this.aanvang, 'dddd D MMM HH:mm', { locale: nl })}`;

  }

  Uitvoering.prototype.status = async function () {
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

  Uitvoering.associate = function (models) {
    models.Uitvoering.Voorstelling = models.Uitvoering.belongsTo(
      models.Voorstelling, {
        onDelete: "CASCADE",
        foreignKey: {
          allowNull: false
        }
      }
    );
    models.Uitvoering.Reserveringen = models.Uitvoering.hasMany(
      models.Reservering
    );

    // scopes ---------------------------

    models.Uitvoering.addScope('defaultScope', {
      include: [{
        model: models.Voorstelling,
        where: {
          active: true
        }
      }]
    }, {
        override: true
      })

  };

  return Uitvoering;
};
