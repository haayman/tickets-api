const {
  Model
} = require('objection');

module.exports = class extends Model {
  static get tableName() {
    return 'statusupdates';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['status', 'betaalstatus', 'reserveringId'],
      properties: {
        status: {
          type: 'string'
        },
        betaalstatus: {
          type: 'boolean'
        },
        reserveringId: {
          type: 'uuid'
        }
      }
    }
  }

  toString() {
    return this.betaalstatus ? `betaling ${this.status}` : this.status
  }

  static get relationMappings() {
    const Reservering = require('./Reservering');
    return {
      reservering: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reservering,
        join: {
          from: 'statusupdates.reserveringId',
          to: 'reserveringen.id'
        }
      }
    }
  }
}
