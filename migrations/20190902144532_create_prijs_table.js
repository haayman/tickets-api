exports.up = function (knex) {
  return knex.schema
    .createTable('prijzen', (table) => {
      table.increments('id');
      table.string('description', 255).notNullable();
      table.decimal('prijs', 10, 5).notNullable();
      table.string('role', 255);
      table.integer('voorstellingId').notNullable().unsigned();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())

      table.foreign('voorstellingId')
        .references('voorstellingen.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('prijzen');
};
