const path = require("path");

module.exports = {
  name: "PlusLeo tickets",
  database: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, "..", "..", "data", "knex.sqlite")
    },
    useNullAsDefault: true
  },
  namespace: "PlusLeoDbNamespace", // t.b.v transacties
  jwtPrivateKey: "Dit is de sleutel waarmee de signon package wordt versleuteld",
  server: {
    url: "https://kaarten.plusleo.nl",
    port: 3000
  },
  mail_transport: {
    debug: false,
    logger: true,
    sendmail: true,
    path: "/usr/sbin/sendmail"
  },
  email: {
    afzender: "PlusLeo",
    afzender_email: "info@plusleo.nl",
    //    alwaysTo: "arjen.haayman@gmail.com",
    subject_prefix: "[PlusLeo]",
  },

  // mail-adres voor teruggave-verzoeken
  penningmeester: 'penningmeester@plusleo.nl',

  // aantal dagen
  teruggave_termijn: 14
};
