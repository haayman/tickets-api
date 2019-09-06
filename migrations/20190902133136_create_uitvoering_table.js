exports.up = async function (knex) {
  return knex.schema
    .createTable('uitvoeringen', (table) => {
      table.increments('id');
      table.datetime('aanvang').notNullable();
      table.datetime('deur_open').notNullable();
      table.string('extra_text', 255);
      table.integer('aantal_plaatsen').notNullable();
      table.integer('voorstellingId').unsigned().notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())

      table.foreign('voorstellingId').references('voorstellingen.id').onDelete('CASCADE').onUpdate('CASCADE');

    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('uitvoeringen');
};
