exports.up = function (knex) {
  return knex.schema
    .createTable('User', (table) => {
      table.increments('id');
      table.string('username', 255).notNullable();
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable().unique();
      table.text('password').notNullable();
      table.string('role', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('User');
};
