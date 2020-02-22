const { Voorstelling } = require('../../../models');

const addDays = require('date-fns/addDays');

module.exports = async function() {
  const voorstelling = await Voorstelling.query()
    .allowGraph('[uitvoeringen,prijzen]')
    .insertGraph({
      title: 'title1',
      description: 'Description 1',
      active: true,
      url: 'https://plusleo.nl/',
      locatie: 'locatie 1',
      opmerkingen: 'opmerkingen1',
      prijzen: [
        {
          description: 'volwassenen',
          prijs: 10
        },
        {
          description: 'kinderen',
          prijs: 5
        },
        {
          description: 'vrijkaartje',
          prijs: 0
        }
      ],
      uitvoeringen: [
        {
          // over 2 maanden: refundable
          aanvang: addDays(new Date(), 60),
          deur_open: new Date(),
          aantal_plaatsen: 2
        },
        {
          // over 10 dagen: niet refundable
          aanvang: addDays(new Date(), 10),
          deur_open: new Date(),
          aantal_plaatsen: 2
        }
      ]
    });

  return voorstelling;
};
