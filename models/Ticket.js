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

module.exports = (sequelize, DataTypes) => {
  let Ticket = sequelize.define(
    "Ticket", {
      betaald: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      tekoop: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      geannuleerd: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verkocht: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      terugbetalen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      paranoid: true, // zorgt er voor dat dit nooit echt verwijderd wordt

      scopes: {
        tekoop: {
          where: {
            tekoop: true
          },
          order: [{
            createdAt: 'ASC'
          }]
        },
        valid: {
          where: {
            geannuleerd: false,
            verkocht: false
          }
        }
      },


      getterMethods: {
        isPaid() {
          return this.Payment && this.Payment.isPaid;
        }
      },
      hooks: {
        afterFind: async function (ticket) {
          if (ticket.length !== undefined) {
            await Promise.all(ticket.map(async (t) => t.getIncludes()));
          } else {
            await ticket.getIncludes();
          }
        }
      }
    }
  );

  Ticket.prototype.getIncludes = async function () {
    this.prijs = await this.getPrijs();
  };

  Ticket.prototype.asString = async function () {
    if (!this.prijs) {
      this.prijs = await this.getPrijs();
    }
    const descr = await this.prijs.asString();
    return `1x ${descr}`;
  }


  /**
   * Maak een beschrijving van een groep tickets
   * @param {*} tickets
   */
  Ticket.description = async function (tickets) {
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
  };

  /**
   * bereken totaalbedrag over een set tickets
   * @param {*} tickets
   */
  Ticket.totaalBedrag = function (tickets) {
    return tickets.reduce((totaal, t) => totaal + t.prijs.prijs, 0);
  };

  Ticket.associate = function (models) {
    Ticket.Payment = Ticket.belongsTo(models.Payment);
    Ticket.Prijs = Ticket.belongsTo(models.Prijs, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
    Ticket.Reservering = Ticket.belongsTo(models.Reservering, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
  };

  return Ticket;
};