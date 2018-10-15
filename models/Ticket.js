module.exports = (sequelize, DataTypes) => {
  let Ticket = sequelize.define("Ticket", {
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
    }
  });

  /**
   * Maak een beschrijving van een groep tickets
   * @param {*} tickets
   */
  Ticket.description = function(tickets) {
    // Tel aantal tickets per prijs
    const counter = {};
    tickets.forEach(t => {
      if (!counter[t.prijs._id]) {
        counter[t.prijs._id] = { prijs: t.prijs, count: 0, bedrag: 0 };
      }
      counter[t.prijs._id].count++;
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
  Ticket.totaalBedrag = function(tickets) {
    return tickets.reduce((totaal, t) => totaal + t.prijs.prijs, 0);
  };

  Ticket.associate = function(models) {
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
