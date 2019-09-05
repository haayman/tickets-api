const Knex = require('knex');
const config = require('config');
const knex = Knex(config.get('database'));
const Voorstelling = require("./models/Voorstelling");
Voorstelling.knex(knex);

(async () => {
  try {
    await Voorstelling.query().delete();
    await Voorstelling.query()
      .allowInsert('[uitvoeringen,prijzen]')
      .insertGraphAndFetch({
        title: "Kamers",
        description: "We doen iets met kamers",
        url: "https://plusleo.nl/producties/fabienne/",
        locatie: "<a href='https://goo.gl/maps/5h7Xsbyrbx62' target='_blank'>Voormalig Kantongerecht<br />Brink 11 / 12<br/>Deventer</a>",
        opmerkingen: "hou er rekening mee dat het koud kan zijn",
        poster: "https://plusleo.nl/producties/fabienne/poster.png",
        thumbnail: "https://plusleo.nl/producties/fabienne/thumb.png",
        prijzen: [{
            description: "Volwassene",
            prijs: 10
          },
          {
            description: "Kind t/m 12",
            prijs: 7.5
          },
          {
            description: "Vrijkaartje",
            role: "speler",
            prijs: 0
          }
        ],
        uitvoeringen: [{
            aanvang: new Date(2018, 10, 15, 20, 0),
            deur_open: new Date(2018, 10, 15, 19, 30),
            aantal_plaatsen: 50
          },
          {
            aanvang: new Date(2019, 4, 1, 20, 0),
            deur_open: new Date(2019, 4, 1, 19, 30),
            aantal_plaatsen: 50
          }, {
            aanvang: new Date(2019, 5, 4, 20, 0),
            deur_open: new Date(2019, 4, 2, 19, 30),
            aantal_plaatsen: 10
          }, {
            aanvang: new Date(2019, 5, 4, 20, 0),
            deur_open: new Date(2019, 4, 3, 19, 30),
            aantal_plaatsen: 2
          }
        ]
      });
  } catch (e) {
    console.log(e);
  }
})();
