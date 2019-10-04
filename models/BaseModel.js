const {
  Model
} = require('objection')

module.exports = class extends Model {
  $beforeInsert(queryContext) {
    this.createdAt = new Date() //.toISOString();
    return super.$beforeInsert(queryContext);
  }

  $beforeUpdate(opt, queryContext) {
    this.updatedAt = new Date() //.toISOString();
    return super.$beforeUpdate(opt, queryContext);
  }

  $formatJson(json) {
    delete json.createdAt;
    delete json.updatedAt;

    return json;
  }

  // bij inserts alle velden die niet in jsonSchema of relationMappings voorkomen verwijderen
  static cleanProperties(json, relations = false) {
    let retval = {}
    // return lodash.pick(json,
    let keys = Object.keys(this.jsonSchema.properties);
    if (relations) {
      keys = keys.concat(Object.keys(this.relationMappings));
    }

    keys.forEach(prop => {
      if (json[prop] !== undefined) {
        retval[prop] = json[prop];
      }
    })

    return retval;
  }

  async save() {
    if (this.id) {
      await this.$query().patch()
    } else {
      let {
        id
      } = await this.$query().insert(this);
      this.id = id;
    }
  }

  async patch(data) {
    await this.$query().patch(data);
  }
}
