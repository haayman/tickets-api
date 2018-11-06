const {
  Voorstelling
} = require('../../../models');

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
      aanvang: new Date(2018, 1, 1),
      deur_open: new Date(2018, 1, 1),
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