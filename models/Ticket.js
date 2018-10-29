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
            return Promise.all(ticket.map(async (t) => t.getIncludes()));
          } else {
            return ticket.getIncludes();
          }
        }
      }
    }
  );

  Ticket.prototype.getIncludes = async function () {
    this.prijs = await this.getPrijs();
  };

  Ticket.prototype.toString = function () {
    return `Ticket ${this.id}`;
    //return Ticket.description([this]);
  }


  /**
   * Maak een beschrijving van een groep tickets
   * @param {*} tickets
   */
  Ticket.description = function (tickets) {
    // Tel aantal tickets per prijs
    const counter = {};
    tickets.forEach(t => {
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
      .map(c => {
        const totaal = (c.count * c.prijs.prijs).toFixed(2);
        const count = c.count;
        return `${count}x ${c.prijs.toString()}: €${totaal}`;
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