const {
  Voorstelling
} = require('../../../models');

const addDays = require('date-fns/add_days');

module.exports = async function () {
  const voorstelling = await Voorstelling.create({
    title: "title1",
    description: "Description 1",
    aantal_plaatsen: 60,
    active: true,
    url: "https://plusleo.nl/",
    locatie: "locatie 1",
    opmerkingen: "opmerkingen1",
    prijzen: [{
        description: "volwassenen",
        prijs: 10
      },
      {
        description: "kinderen",
        prijs: 5
      },
      {
        description: "vrijkaartje",
        prijs: 0
      }
    ],
    uitvoeringen: [{
      // over 2 maanden: refundable
      aanvang: addDays(new Date(), 60),
      deur_open: new Date(),
      aantal_plaatsen: 2
    }, {
      // over 10 dagen: niet refundable
      aanvang: addDays(new Date(), 10),
      deur_open: new Date(),
      aantal_plaatsen: 2
    }]
  }, {
    include: [{
        association: Voorstelling.Prijzen
      },
      {
        association: Voorstelling.Uitvoeringen
      }
    ]
  });

  return voorstelling;
}