// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: "My app (dev)",
  useMorgan: true,
  payment: {
    mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
  },
  database: {
    debug: true,
    asyncTrackTraces: true
  },

  server: {
    url: 'https://kaarten.dev.plusleo.nl',
    port: 3001
  },
  email: {
    subject_prefix: "[PlusLeo dev]",
    alwaysTo: "arjen.haayman+plusleo@gmail.com"
  }

};
