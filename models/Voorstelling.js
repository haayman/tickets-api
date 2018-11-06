const Prijs = require("./Prijs");
const Uitvoering = require("./Uitvoering");

module.exports = (sequelize, DataTypes) => {
  const Voorstelling = sequelize.define(
    "Voorstelling", {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      url: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true
        }
      },
      locatie: {
        type: DataTypes.STRING
      },
      opmerkingen: {
        type: DataTypes.STRING
      },
      poster: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true
        }
      },
      thumbnail: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true
        }
      }
    }, {
      name: {
        singular: "voorstelling",
        plural: "voorstellingen"
      }
    }
  );

  Voorstelling.prototype.toJSONA = async function (res = null) {
    let obj = this.toJSON();
    const uitvoeringen = await this.getUitvoeringen();
    if (obj.prijzen) {
      obj.prijzen = obj.prijzen.sort((a, b) => b.prijs - a.prijs)
      if (res) {
        const user = res.locals.user;
        obj.prijzen = obj.prijzen.filter((p) => {
          return !p.role || (user && user.isAuthorized(p.role));
        })

      }
    }
    obj.uitvoeringen = await Promise.all(
      uitvoeringen.map(async v => v.toJSONA(res))
    );

    return obj;
  };

  Voorstelling.prototype.toString = function () {
    return this.title;
  }

  Voorstelling.associate = function (models) {
    const embed = require("sequelize-embed")(sequelize);
    const {
      mkInclude
    } = embed.util.helpers;

    models.Voorstelling.Prijzen = models.Voorstelling.hasMany(models.Prijs);
    // models.Prijs.belongsTo(models.Voorstelling);

    models.Voorstelling.Uitvoeringen = models.Voorstelling.hasMany(
      models.Uitvoering
    );
    // models.Uitvoering.belongsTo(models.Voorstelling);

    // https://www.npmjs.com/package/sequelize-embed
    Voorstelling.updateIncludes = (voorstellingData, options) => {
      if (options.include) {
        let include = options.include.map(include => mkInclude(include));
        _options = Object.assign({}, options, {
          reload: include
        });
        embed.update(Voorstelling, voorstellingData, include, _options);
      } else {
        Voorstelling.update(voorstellingData, options);
      }
    };
  };

  return Voorstelling;
};