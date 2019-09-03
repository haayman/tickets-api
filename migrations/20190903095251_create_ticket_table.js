exports.up = function (knex) {
  return knex.schema
    .createTable('Ticket', (table) => {
      table.increments('id');
      table.boolean('betaald').defaultTo(false);
      table.boolean('tekoop').defaultTo(false);
      table.boolean('geannuleerd').defaultTo(false);
      table.boolean('verkocht').defaultTo(false);
      table.boolean('terugbetalen').defaultTo(false);
      table.integer('paymentId').unsigned();
      table.uuid('reserveringId');
      table.integer('prijsId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('deletedAt')

      table.foreign('paymentId').references('Payment.id').onDelete('CASCADE')
      table.foreign('reserveringId').references('Reservering.id').onDelete('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('Ticket');
};
