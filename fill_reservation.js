process.env.ENV = 'development';

const Knex = require('knex');
const config = require('config');
const knex = Knex(config.get('database'));
const { Voorstelling, Reservering } = require('./models/');
const { Model } = require('objection');

Model.knex(knex);

Voorstelling.query()
  .withGraphFetched('[uitvoeringen,prijzen]')
  .then(async (voorstellingen) => {
    const voorstelling = voorstellingen[0];
    const uitvoering = voorstelling.uitvoeringen[0];
    const prijs = voorstelling.prijzen[0];

    for (let i = 0; i <= 200; i++) {
      await Reservering.query().insertGraph({
        naam: 'Arjen',
        email: 'arjen@plusleo.nl',
        uitvoeringId: uitvoering.id,
        tickets: [
          {
            prijsId: prijs.id
          },
          {
            prijsId: prijs.id
          }
        ],
        opmerking_gebruiker: `opmerking ${i}`
      });
    }
  })
  .finally(() => {
    knex.destroy();
  });
