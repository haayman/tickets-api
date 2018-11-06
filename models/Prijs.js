module.exports = (sequelize, DataTypes) => {
  let Prijs = sequelize.define(
    "Prijs", {
      description: {
        type: DataTypes.STRING,
        allowNull: false
      },
      prijs: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      name: {
        singular: "prijs",
        plural: "prijzen"
      }
    }
  );

  Prijs.prototype.asString = function () {
    return `${this.description} (à € ${this.prijs.toFixed(2)})`;
  };

  Prijs.associate = function (models) {
    Prijs.Voorstelling = models.Prijs.belongsTo(models.Voorstelling, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
  };

  return Prijs;
};