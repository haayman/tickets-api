const { Model } = require('objection');

/**
 *
 * @param {Date|null|string} date
 */
function convertDate(date) {
  let strDate;
  if (date instanceof Date) {
    strDate = date.toISOString();
  } else if (!date) {
    strDate = new Date().toISOString();
  } else {
    strDate = date;
  }
  return strDate.slice(0, 19).replace('T', ' ');
}

module.exports = class extends Model {
  $beforeInsert(queryContext) {
    this.createdAt = convertDate(new Date());
    this.updatedAt = convertDate(new Date());
    return super.$beforeInsert(queryContext);
  }

  $beforeUpdate(opt, queryContext) {
    this.createdAt = convertDate(this.createdAt);
    this.updatedAt = convertDate(new Date());
    return super.$beforeUpdate(opt, queryContext);
  }

  // $formatJson(json) {
  //   delete json.createdAt;
  //   delete json.updatedAt;

  //   return json;
  // }

  // bij inserts alle velden die niet in jsonSchema of relationMappings voorkomen verwijderen
  static cleanProperties(json, relations = false) {
    let retval = {};
    // return lodash.pick(json,
    let keys = Object.keys(this.jsonSchema.properties);
    if (relations) {
      keys = keys.concat(Object.keys(this.relationMappings));
    }

    keys.forEach((prop) => {
      if (json[prop] !== undefined) {
        retval[prop] = json[prop];
      }
    });

    return retval;
  }

  /**
   * create as save() method
   */
  async save() {
    if (this.id) {
      await this.$query().patch();
    } else {
      let { id } = await this.$query().insert(this);
      this.id = id;
    }
  }

  async patch(data) {
    await this.$query().patch(data);
  }
};
