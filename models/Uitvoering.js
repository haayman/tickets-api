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
    obj.vrije_plaatsen = obj.aantal_plaatsen - obj.gereserveerd;

    return obj;
  };

  Uitvoering.prototype.getVrijePlaatsen = async function (reservering_id = 0) {
    const gereserveerd = await this.getGereserveerd(reservering_id);
    return this.aantal_plaatsen - gereserveerd;
  };

  Uitvoering.prototype.getGereserveerd = async function (reservering_id = 0) {
    const gereserveerd = await this.countTickets(false, reservering_id);
    return gereserveerd;
  };

  Uitvoering.prototype.getWachtlijst = async function (reservering_id = 0) {
    const wachtlijst = await this.countTickets(true, reservering_id);
    return wachtlijst;
  };


  Uitvoering.prototype.countTickets = async function (
    wachtlijst = false,
    reservering_id = null
  ) {
    const reserveringClause = reservering_id ?
      " and id != :reservering_id" :
      "";
    let sql = `select count(*) as count from Ticket where verkocht=false 
      and geannuleerd=false and 
      reserveringId IN (select id from Reservering where 
        uitvoeringId = :uitvoeringId 
        AND wachtlijst = :wachtlijst ${reserveringClause})`;

    const [result] = await sequelize.query(sql, {
      replacements: {
        uitvoeringId: this.id,
        wachtlijst: wachtlijst,
        reservering_id: reservering_id
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
    const vrije_plaatsen = await this.getVrijePlaatsen();
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
    await Promise.all(vrijgekomen.map(gelukkige => {
      return gelukkige.haalUitWachtrij();
    }));
  };

  /**
   * welke tickets staan te koop voor deze Uitvoering
   * @param {number} aantal 
   * @return {Ticket[]}
   */
  Uitvoering.prototype.tekoop = async function (aantal = null) {
    const Ticket = Uitvoering.sequelize.models.Ticket;
    const sql = `SELECT * from Ticket
      WHERE reserveringId in (SELECT id from reservering where uitvoeringId=:uitvoeringId)
      AND tekoop=true`;

    const tickets = await sequelize.query(sql, {
      model: Ticket,
      replacements: {
        uitvoeringId: this.id
      },
      type: sequelize.QueryTypes.SELECT
    })
    return tickets
  }

  /**
   * Verkoop {aantal} tickets
   * @async
   * @param {number} aantal
   * @returns {Promise}
   */
  Uitvoering.prototype.verwerkTekoop = async function (aantal) {
    const tekoop = await this.tekoop(aantal);
    let verkocht = {};

    await Promise.all(tekoop.map(async (ticket) => {
      const reservering = await ticket.getReservering();
      verkocht[reservering.id] = reservering;

      ticket.verkocht = true;
      ticket.tekoop = false;
      ticket.terugbetalen = true;

      await ticket.save();
      await reservering.logMessage(`${ticket} verkocht`);
    }))

    await Promise.all(
      Object.values(verkocht).map(async r => r.refund()));

    return;
  }

  Uitvoering.prototype.toString = function () {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text} ${format(this.aanvang, 'dddd d MMM HH:mm', {locale: nl})}`;

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