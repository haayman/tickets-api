const mongoose = require("mongoose");
const config = require("config");

mongoose.pluralize(null);

const Voorstelling = require("./models/Voorstelling");
const { Uitvoering } = require("./models/Uitvoering");
const { Prijs } = require("./models/Prijs");

mongoose
  .connect(
    config.get("database.connection"),
    { useNewUrlParser: true }
  )
  .then(() => {
    console.log("connected");
    const voorstelling = new Voorstelling({
      title: "Daisy",
      description: "Waar is Daisy?",
      aantal_plaatsen: 60,
      active: true,
      url: "https://plusleo.nl/producties/daisy",
      locatie: "In het bos",
      opmerkingen: "Neem een kussentje mee",
      prijzen: [
        new Prijs({
          description: "Volwassene",
          prijs: 10
        }),
        new Prijs({
          description: "kind t/m 12",
          prijs: 7.5
        }),
        new Prijs({
          description: "vrijkaartje",
          prijs: 0,
          role: ["speler", "admin"]
        })
      ],
      uitvoeringen: [
        new Uitvoering({
          aanvang: new Date(2017, 3, 1, 20, 0),
          deur_open: new Date(2017, 3, 1, 19, 30),
          vrije_plaatsen: 50,
          gereserveerd: 0,
          wachtlijst: 0,
          aantal_plaatsen: 50
        }),
        new Uitvoering({
          aanvang: new Date(2017, 3, 2, 20, 0),
          deur_open: new Date(2017, 3, 2, 19, 30),
          vrije_plaatsen: 50,
          gereserveerd: 0,
          wachtlijst: 0,
          aantal_plaatsen: 50
        }),
        new Uitvoering({
          aanvang: new Date(2017, 3, 3, 20, 0),
          deur_open: new Date(2017, 3, 3, 19, 30),
          vrije_plaatsen: 50,
          gereserveerd: 0,
          wachtlijst: 0,
          aantal_plaatsen: 50
        })
      ]
    });

    voorstelling
      .save()
      .then(voorstelling => console.log(voorstelling))
      .catch(e => console.error("Kan voorstelling niet opslaan: ", e))
      .then(() => {
        mongoose.disconnect();
      });

    Voorstelling.find()
      .sort({ aanvang: 1 })
      .then(voorstellingen => {
        console.log(JSON.stringify(voorstellingen, null, 4));
        mongoose.disconnect();
      });
  })
  .catch(e => console.error("Error", e));
