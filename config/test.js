// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: "My app (dev)",
  useMorgan: true,
  logLevel: "error",
  payment: {
    mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8",
  },
  database: {
    client: "mysql",
    connection: {
      host: "192.168.1.2",
      user: "plusleo",
      database: "tickets_test",
      password: "lekker grote database",
      debug: false,
    },
  },

  server: {
    url: "https://kaarten.dev.plusleo.nl",
    port: 3001,
  },
  email: {
    subject_prefix: "[PlusLeo test]",
    alwaysTo: "arjen.haayman+plusleo@gmail.com",
  },
};
