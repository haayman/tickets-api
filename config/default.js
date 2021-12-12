const path = require("path");

module.exports = {
  name: "PlusLeo tickets",
  useMorgan: true,
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
    url: "linux",
  },

  payment: {
    mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8",
  },

  namespace: "PlusLeoDbNamespace", // t.b.v transacties
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

  // mail-adres voor teruggave-verzoeken
  penningmeester: "adinda@jatheater.nl",

  // aantal dagen
  teruggave_termijn: 14,
};
