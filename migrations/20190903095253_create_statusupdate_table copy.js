exports.up = function (knex) {
  return knex.schema
    .createTable('StatusUpdate', (table) => {
      table.increments('id');
      table.string('status', 255).notNullable();
      table.boolean('betaalstatus').notNullable();
      table.uuid('reserveringId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())

      table.foreign('reserveringId').references('Reservering.id').onDelete('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('StatusUpdate');
};
