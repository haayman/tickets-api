const Knex = require('knex');
const config = require('config');
const knex = Knex(config.get('database'));
const {
  Model
} = require('objection');

module.exports = function () {
  Model.knex(knex);
}
