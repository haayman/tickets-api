process.env.ENV = "development";

const config = require("config");

const Reservering = require("./models/Reservering");
const Voorstelling = require("./models/Voorstelling");

mongoose
  .connect(
    config.get("database.connection"),
    { useNewUrlParser: true }
  )
  .then(async () => {
    console.log("connected");
    await Reservering.deleteMany({});
    const voorstellingen = await Voorstelling.find()
      .populate("prijzen")
      .populate("uitvoeringen");
    // console.log("voorstellingen", JSON.stringify(voorstellingen, null, 4));

    const voorstelling = voorstellingen[0];
    const uitvoering = voorstelling.uitvoeringen[0];
    const prijs = voorstelling.prijzen[0];

    const reservering = new Reservering({
      naam: "Arjen",
      email: "arjen@plusleo.nl",
      uitvoering: uitvoering._id,
      tickets: [
        {
          prijs: prijs,
          aantal: 2
        }
      ]
    });

    try {
      await reservering.save();
    } catch (e) {
      console.error("Kan reservering niet opslaan: ");
      throw e;
    }

    const reserveringen = await Reservering.find({}).populate(
      "tickets payments"
    );
    const paymentUrl = await reserveringen[0].paymentUrl();
    console.log("paymentUrl");

    console.log(JSON.stringify(reserveringen, null, 4));
    mongoose.disconnect();
  })
  .catch(e => {
    console.error("Error", e);
    mongoose.disconnect();
  });
