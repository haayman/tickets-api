const {
  Reservering,
  Log
} = require("./models/");

(async () => {
  try {
    const reserveringen = await Reservering.findAll({
        limit: 1
      }),
      reservering = reserveringen[0];
    for (let i = 0; i < 500; i++) {
      await reservering.logMessage(`message ${i}`)
    }
  } catch (e) {
    console.log(e);
  }
})();