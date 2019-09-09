const UUIDTrigger = require('./functions/UUIDTrigger')

exports.up = function (knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.uuid('id').primary();
      table.string('username', 255).notNullable();
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable().unique();
      table.text('password').notNullable();
      table.string('role', 255).notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())

    }).then(() => knex.raw(UUIDTrigger('users')));
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
