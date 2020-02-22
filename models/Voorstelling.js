const BaseModel = require('./BaseModel');
const {
  Model
} = require('objection');

module.exports = class Voorstelling extends BaseModel {
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

  $formatJson(json) {
    json = super.$formatJson(json);

    if (json.prijzen) {
      // aflopende volgorde
      json.prijzen = json.prijzen.sort((a, b) => b.prijs - a.prijs);
    }

    return json;
  }

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
