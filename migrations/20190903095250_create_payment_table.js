exports.up = function (knex) {
  return knex.schema
    .createTable('payments', (table) => {
      table.increments('id');
      table.string('paymentId', 255)
      table.string('betaalstatus', 255);
      table.string('description', 255);
      table.decimal('paidBack', 10, 5);
      table.uuid('reserveringId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('deletedAt').nullable()

      table.foreign('reserveringId')
        .references('reserveringen.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('payments');
};
