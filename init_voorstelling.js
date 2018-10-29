const models = require("./models");
(async () => {
  try {
    models.Voorstelling.create(
      {
        title: "Kamers",
        description: "We doen iets met kamers",
        url: "https://plusleo.nl/producties/daisy/",
        locatie: "nog niet bekend",
        poster: "https://plusleo.nl/producties/daisy/poster.png",
        thumbnail: "https://plusleo.nl/producties/daisy/thumb.png"
        // prijzen: [
        //   {
        //     description: "Volwassene",
        //     prijs: 10
        //   },
        //   {
        //     description: "kinderen t/m 12",
        //     prijs: 7
        //   },
        //   {
        //     description: "vrijkaartje",
        //     role: "speler",
        //     prijs: 0
        //   }
        // ]
      }
      // {
      //   include: [{ associate: models.Voorstelling.Prijzen }]
      // }
    );
  } catch (e) {
    console.log(e);
  }
})();
