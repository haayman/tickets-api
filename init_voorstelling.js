const Knex = require('knex');
const config = require('config');
const knex = Knex(config.get('database'));
const Voorstelling = require('./models/Voorstelling');
const { Model } = require('objection');
const addDays = require('date-fns/add_days');
const addMinutes = require('date-fns/add_minutes');

Model.knex(knex);

const insert = async () => {
  try {
    await Voorstelling.query().delete();
    let aanvang = addDays(new Date(), 10); // over 10 dagen
    aanvang.setHours(20);
    aanvang.setMinutes(0);
    let deur_open = addMinutes(aanvang, -30);
    await Voorstelling.query()
      .allowGraph('[uitvoeringen,prijzen]')
      .insertGraphAndFetch({
        title: 'Fabiënne',
        description: 'We doen iets met kamers',
        url: 'https://plusleo.nl/producties/fabienne/',
        locatie:
          "<a href='https://goo.gl/maps/5h7Xsbyrbx62' target='_blank'>Voormalig Kantongerecht<br />Brink 11 / 12<br/>Deventer</a>",
        opmerkingen: 'hou er rekening mee dat het koud kan zijn',
        poster: 'https://plusleo.nl/producties/fabienne/poster.png',
        thumbnail: 'https://plusleo.nl/producties/fabienne/thumb.png',
        prijzen: [
          {
            description: 'Volwassene',
            prijs: 10
          },
          {
            description: 'Kind t/m 12',
            prijs: 7.5
          },
          {
            description: 'Vrijkaartje',
            role: 'speler',
            prijs: 0
          }
        ],
        uitvoeringen: [
          {
            aanvang: aanvang,
            deur_open: deur_open,
            aantal_plaatsen: 50
          },
          {
            aanvang: addDays(aanvang, 30),
            deur_open: addDays(deur_open, 30),
            aantal_plaatsen: 50
          },
          {
            aanvang: addDays(aanvang, 31),
            deur_open: addDays(deur_open, 31),
            aantal_plaatsen: 10
          },
          {
            aanvang: addDays(aanvang, 32),
            deur_open: addDays(deur_open, 32),
            aantal_plaatsen: 2
          }
        ]
      });
  } catch (e) {
    console.log(e);
  }
};

insert().then(() => console.log('done'));
