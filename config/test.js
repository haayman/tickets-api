const path = require('path');

module.exports = {
  "jwtPrivateKey": "test",
  "payment": {
    "mollie_key": "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
  },
  database: {
    storage: path.resolve(__dirname, "..", "data", "test.sqlite"),
    logging: true
  },
  namespace: "PlusLeoTestNamespace", // t.b.v transacties,
  server: {
    url: "https://dev.plusleo.nl"
  }

}