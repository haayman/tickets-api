module.exports = (sequelize, DataTypes) => {
  let StatusUpdate = sequelize.define(
    "StatusUpdate",
    {
      status: { type: DataTypes.STRING, allowNull: true },
      betaalstatus: { type: DataTypes.BOOLEAN, allowNull: false }
    },
    {
      getterMethods: {
        asString() {
          return this.betaalstatus ? `betaling ${this.status}` : this.status;
        }
      }
    }
  );

  StatusUpdate.associate = function(models) {
    StatusUpdate.Reservering = models.StatusUpdate.belongsTo(
      models.Reservering,
      {
        onDelete: "CASCADE",
        foreignKey: {
          allowNull: false
        }
      }
    );
  };

  return StatusUpdate;
};
