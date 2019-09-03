exports.up = function (knex) {
  return knex.schema
    .createTable('Payment', (table) => {
      table.increments('id');
      table.string('betaalstatus', 255);
      table.string('description', 255);
      table.decimal('paidBack', 10, 5).notNullable();
      table.string('role', 255);
      table.uuid('reserveringId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('deletedAt').defaultTo(knex.fn.now())

      table.foreign('reserveringId')
        .references('Reservering.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('Payment');
};
