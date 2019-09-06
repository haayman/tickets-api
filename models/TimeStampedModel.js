const {
  Model
} = require('objection')

module.exports = class extends Model {
  $beforeInsert(queryContext) {
    this.createdAt = new Date().toISOString();
    return super.$beforeInsert(queryContext);
  }

  $beforeUpdate(opt, queryContext) {
    this.updatedAt = new Date().toISOString();
    return super.$beforeUpdate(opt, queryContext);
  }
}
