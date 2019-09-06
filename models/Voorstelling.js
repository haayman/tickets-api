const TimestampedModel = require('./TimestampedModel');

module.exports = class Voorstelling extends TimestampedModel {
  static get tableName() {
    return 'voorstellingen';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        id: {
          type: 'integer'
        },
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        },
        active: {
          type: 'boolean'
        },
        url: {
          type: 'string',
          format: 'uri'
        },
        locatie: {
          type: 'string'
        },
        opmerkingen: {
          type: 'string'
        },
        poster: {
          type: 'string',
          format: 'uri'
        },
        thumbnail: {
          type: 'string',
          format: 'uri'
        },
      }
    }
  }

  async toJSONA(res = null) {
    let obj = this.toJSON();
    const uitvoeringen = await this.uitvoeringen;
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

  // toString() {
  //   return this.title;
  // }

  static get relationMappings() {
    const Prijs = require('./Prijs');
    const Uitvoering = require('./Uitvoering');
    return {
      prijzen: {
        relation: Model.HasManyRelation,
        modelClass: Prijs,
        join: {
          from: 'prijzen.voorstellingId',
          to: 'voorstellingen.id'
        },
      },
      uitvoeringen: {
        relation: Model.HasManyRelation,
        modelClass: Uitvoering,
        join: {
          from: 'uitvoeringen.voorstellingId',
          to: 'voorstellingen.id'
        }
      }
    }
  }

};
