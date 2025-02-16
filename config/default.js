const path = require("path");

module.exports = {
  name: "jatheater",
  useMorgan: true,
  logLevel: "info",
  database: {
    client: "mysql",
    connection: {
      host: "host",
      database: "db",
      user: "plusleo",
      password: "pw",
    },
    debug: false,
  },
  redis: {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    port: 6379,
    host: "localhost",
    family: 4,
    db: 0,
  },

  // payment: {
  //   mollie_key: "",
  // },

  jwtPrivateKey:
    "Dit is de sleutel waarmee de signon package wordt versleuteld",
  server: {
    url: "https://kaarten.jatheater.nl",
    port: 3000,
  },
  mail_transport: {
    // debug: false,
    // logger: true,
    // sendmail: true,
    // path: "/usr/sbin/sendmail",
  },
  email: {
    afzender: "Ja!Theater",
    afzender_email: "info@jatheater.nl",
    //    alwaysTo: "arjen.haayman@gmail.com",
    // bcc: 'info@jatheater.nl',
    subject_prefix: "[Ja!Theater]",
  },

  // email_roots: [
  //   path.resolve(__dirname, "..", "emails", "jatheater"),
  //   path.resolve(__dirname, "..", "emails"),
  // ],

  // aantal dagen
  teruggave_termijn: 14,
};
