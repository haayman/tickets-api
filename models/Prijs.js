const {
  Model
} = require('objection');

module.exports = class Prijs extends Model {
  static get tableName() {
    return 'Prijs'
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
          type: 'string'
        }
      }
    }
  }

  asString() {
    return this.description;
  }

  static get relationMappings() {
    const Voorstelling = require('./Voorstelling');
    return {
      voorstelling: {
        relation: Model.BelongsToOneRelation,
        modelClass: Voorstelling,
        join: {
          from: 'Prijs.voorstellingId',
          to: 'Voorstelling.id'
        }
      }
    }
  }
}
