exports.up = function (knex) {
  return knex.schema
    .createTable('tickets', (table) => {
      table.increments('id');
      table.boolean('betaald').defaultTo(false);
      table.boolean('tekoop').defaultTo(false);
      table.boolean('geannuleerd').defaultTo(false);
      table.boolean('verkocht').defaultTo(false);
      table.boolean('terugbetalen').defaultTo(false);
      table.integer('paymentId').unsigned();
      table.uuid('reserveringId').notNullable();
      table.integer('prijsId').unsigned().notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('deletedAt').nullable();

      table.foreign('paymentId').references('payments.id').onDelete('CASCADE')
      table.foreign('reserveringId').references('reserveringen.id').onDelete('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('tickets');
};
