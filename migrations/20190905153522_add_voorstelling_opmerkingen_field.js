exports.up = function (knex) {
  return knex.schema
    .table('Voorstelling', (table) => {
      table.string('opmerkingen', 255);
    })
};

exports.down = function (knex) {
  return knex.schema.table('Voorstelling', (table) => {
    table.dropColumn('opmerkingen');
  });
};
