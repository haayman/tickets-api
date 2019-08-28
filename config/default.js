const path = require("path");

module.exports = {
  name: "PlusLeo tickets",
  database: {
    dialect: "sqlite",
    storage: path.resolve(__dirname, "..", "..", "data", "tickets.sqlite"),
    define: {
      charset: "utf8",
      dialectOptions: {
        collate: "utf8_general_ci"
      },
      timestamps: true,
      freezeTableName: true,
      logging: false
    },
  },
  namespace: "PlusLeoDbNamespace", // t.b.v transacties
  jwtPrivateKey: "Dit is de sleutel waarmee de signon package wordt versleuteld",
  server: {
    url: "https://kaarten.plusleo.nl",
    port: 3000
  },
  mail_transport: {
    debug: true,
    logger: true,
    sendmail: true,
    path: "/usr/sbin/sendmail"
  },
  email: {
    afzender: "PlusLeo",
    afzender_email: "info@plusleo.nl",
    //    alwaysTo: "arjen.haayman@gmail.com",
    subject_prefix: "[PlusLeo]",
    bcc: "info@plusleo.nl"
  },

  // mail-adres voor teruggave-verzoeken
  penningmeester: 'penningmeester@plusleo.nl',

  // aantal dagen
  teruggave_termijn: 14
};
