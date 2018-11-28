const path = require('path');
const winston = require('winston');

module.exports = {
  "jwtPrivateKey": "test",
  "payment": {
    "mollie_key": "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
  },
  database: {
    storage: path.resolve(__dirname, "..", "data", "test.sqlite"),
    logging: false
  },
  namespace: "PlusLeoTestNamespace", // t.b.v transacties,
  server: {
    url: "https://dev.plusleo.nl"
  },
  mail_transport: {
    // debug: true,
    // logger: true,
    sendmail: false, // override default
    path: "",
    host: "smtp.t-mobilethuis.nl",
    port: 465,
    secure: true,
    auth: {
      user: "plusleo@t-mobilethuis.nl",
      pass: "u9cW^nCG5RMNT6e@HZS1jE@"
    }
  }

}