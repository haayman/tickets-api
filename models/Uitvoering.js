module.exports = (sequelize, DataTypes) => {
  let Uitvoering = sequelize.define(
    "Uitvoering",
    {
      aanvang: {
        type: DataTypes.DATE,
        allowNull: false
      },
      deur_open: {
        type: DataTypes.DATE,
        allowNull: false
      },
      extra_text: { type: DataTypes.STRING, allowNull: true },
      aantal_plaatsen: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      }
    },
    {
      name: {
        singular: "uitvoering",
        plural: "uitvoeringen"
      }
    }
  );

  Uitvoering.prototype.toJSONA = async function() {
    let obj = this.toJSON();
    obj.gereserveerd = await this.getGereserveerd();
    obj.wachtlijst = await this.getWachtlijst();
    obj.vrije_plaatsen = obj.aantal_plaatsen - obj.gereserveerd;

    return obj;
  };

  Uitvoering.prototype.getVrijePlaatsen = async function(reservering_id = 0) {
    const gereserveerd = await this.getGereserveerd(reservering_id);
    return this.aantal_plaatsen - gereserveerd;
  };

  Uitvoering.prototype.getGereserveerd = async function(reservering_id = 0) {
    const gereserveerd = await this.countTickets(false, reservering_id);
    return gereserveerd;
  };

  Uitvoering.prototype.getWachtlijst = async function(reservering_id = 0) {
    const wachtlijst = await this.countTickets(true, reservering_id);
    return wachtlijst;
  };

  Uitvoering.prototype.countTickets = async function(
    wachtlijst = false,
    reservering_id = null
  ) {
    const reserveringClause = reservering_id ? " and id != :reserveringId" : "";
    let sql = `select count(*) as count from Ticket where verkocht=false 
      and geannuleerd=false and 
      reserveringId IN (select id from Reservering where wachtlijst != :wachtlijst ${reserveringClause})`;

    const [result] = await sequelize.query(sql, {
      replacements: {
        wachtlijst: wachtlijst,
        reservering_id: reservering_id
      },
      type: sequelize.QueryTypes.SELECT
    });

    return result.count;
  };

  Uitvoering.associate = function(models) {
    models.Uitvoering.Voorstelling = models.Uitvoering.belongsTo(
      models.Voorstelling,
      {
        onDelete: "CASCADE",
        foreignKey: {
          allowNull: false
        }
      }
    );
    models.Uitvoering.Reserveringen = models.Uitvoering.hasMany(
      models.Reservering
    );
  };

  return Uitvoering;
};
