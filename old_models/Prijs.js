const BaseModel = require("./BaseModel");
const { Model } = require("objection");

module.exports = class Prijs extends BaseModel {
  static get tableName() {
    return "prijzen";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["description", "prijs"],
      properties: {
        id: {
          type: "integer"
        },
        description: {
          type: "string"
        },
        prijs: {
          type: "number",
          minimum: 0
        },
        role: {
          anyOf: [
            {
              type: "string"
            },
            {
              type: "null"
            }
          ]
        },
        voorstellingId: {
          type: "integer"
        }
      }
    };
  }

  toString() {
    return this.description;
  }

  /**
   * zorg er voor dat prijs numeriek is
   * @param {*} json
   * @param {*} opt
   */
  $parseJson(json, opt) {
    json = super.$parseJson(json, opt);
    json.prijs = +json.prijs;

    return json;
  }

  static get relationMappings() {
    const Voorstelling = require("./Voorstelling");
    return {
      voorstelling: {
        relation: Model.BelongsToOneRelation,
        modelClass: Voorstelling,
        join: {
          from: "prijzen.voorstellingId",
          to: "voorstellingen.id"
        }
      }
    };
  }
};
