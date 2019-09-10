const TimestampedModel = require('./TimestampedModel')
const {
  Model
} = require('objection');

module.exports = class Prijs extends TimestampedModel {
  static get tableName() {
    return 'prijzen'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['description', 'prijs'],
      properties: {
        id: {
          type: 'integer'
        },
        description: {
          type: 'string'
        },
        prijs: {
          type: 'number',
          minimum: 0,
        },
        role: {
          anyOf: [{
              type: 'string'
            },
            {
              type: 'null'
            }
          ]

        }
      }
    }
  }

  toString() {
    return this.description;
  }

  static get relationMappings() {
    const Voorstelling = require('./Voorstelling');
    return {
      voorstelling: {
        relation: Model.BelongsToOneRelation,
        modelClass: Voorstelling,
        join: {
          from: 'prijzen.voorstellingId',
          to: 'voorstellingen.id'
        }
      }
    }
  }
}
