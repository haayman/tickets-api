module.exports = (sequelize, DataTypes) => {
  const Log = sequelize.define("Log", {
    message: { type: DataTypes.TEXT, allowNull: false }
  });

  Log.associate = function(models) {
    Log.Reservering = models.Log.belongsTo(models.Reservering, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false
      }
    });
  };

  return Log;
};
