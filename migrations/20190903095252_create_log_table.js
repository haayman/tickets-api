exports.up = function (knex) {
  return knex.schema
    .createTable('logs', (table) => {
      table.increments('id');
      table.text('message').notNullable();
      table.text('sourceCode').notNullable();
      table.uuid('reserveringId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())

      table.foreign('reserveringId').references('reserveringen.id').onDelete('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('Log');
};
