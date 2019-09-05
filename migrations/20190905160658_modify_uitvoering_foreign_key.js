exports.up = async function (knex) {
  return knex.schema
    .table('Uitvoering', (table) => {
      table.dropForeign('voorstellingId');
      table.foreign('voorstellingId').references('Voorstelling.id').onDelete('CASCADE').onUpdate('CASCADE');
    })
};

exports.down = function (knex) {};
