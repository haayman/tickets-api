exports.up = function (knex) {
  return knex.schema
    .createTable('voorstellingen', (table) => {
      table.increments('id');
      table.string('title', 255).notNullable().unique();
      table.text('description').notNullable();
      table.string('opmerkingen', 255);
      table.boolean('active').defaultTo(true);
      table.string('url', 255);
      table.string('locatie', 255);
      table.string('poster', 255);
      table.string('thumbnail', 255);
      table.timestamp('createdAt').defaultTo(knex.fn.now())
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
    })
};

exports.down = function (knex) {
  return knex.schema.dropTable('voorstellingen');
};
