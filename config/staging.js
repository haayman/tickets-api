// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: "My app (dev)",
  useMorgan: true,
  payment: {
    mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
  },
  server: {
    url: "https://reserveren.plusleo.nl",
    port: 3003
  },
};