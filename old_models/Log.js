const {
  Model
} = require('objection');
const stackTrace = require("stack-trace");
const path = require("path");


module.exports = class Log extends Model {
  static get tableName() {
    return 'logs';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string'
        },
        sourceCode: {
          type: 'string'
        },
        reserveringId: {
          type: 'uuid'
        }
      }
    }
  }

  static get relationMappings() {
    const Reservering = require('./Reservering');
    return {
      reservering: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reservering,
        join: {
          from: 'logs.reserveringId',
          to: 'reserveringen.id'
        }
      }
    }
  }

  static async addMessage(reservering, message, trx) {
    const trace = stackTrace.get();
    const caller = trace[1];

    await reservering.$relatedQuery('logs', trx).insert({
      message: message,
      sourceCode: `${path.basename(
        caller.getFileName()
      )}(${caller.getLineNumber()})`
    });
  }
}
