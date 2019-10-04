const UUIDTrigger = require('./functions/UUIDTrigger')

exports.up = function (knex) {
  return knex.schema
    .createTable('reserveringen', (table) => {
      table.uuid('id').primary();
      table.string('naam', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('opmerking', 255);
      table.string('opmerking_gebruiker', 255);
      table.string('status', 255);
      table.boolean('wachtlijst').defaultTo(false);
      table.datetime('ingenomen');
      // table.decimal('bedrag', 10, 5);
      table.string('iban', 255);
      table.string('tennamevan', 255);
      table.integer('uitvoeringId').unsigned().notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())

      table.foreign('uitvoeringId').references('uitvoeringen.id').onDelete('CASCADE')
    });
};

exports.down = function (knex) {
  return knex.schema.dropTable('reserveringen');
};
