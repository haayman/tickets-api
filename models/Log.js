module.exports = (sequelize, DataTypes) => {
  const Log = sequelize.define("Log", {
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sourceCode: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    paranoid: true, // zorgt er voor dat dit nooit echt verwijderd wordt

  });

  Log.associate = function (models) {
    Log.Reservering = models.Log.belongsTo(models.Reservering, {
      onDelete: "SET NULL",
      foreignKey: {
        allowNull: false
      }
    });
    Log.User = models.Log.belongsTo(models.User), {
      onDelete: 'SET NULL',
      foreignKey: {
        allowNull: true
      }
    }
  };

  return Log;
};