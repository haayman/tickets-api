// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: 'My app (dev)',
  useMorgan: true,
  payment: {
    mollie_key: 'test_DMVExh3QMmTN6tjUku59cjPzQJNhf8'
  },
  server: {
    url: 'https://kaarten.staging.plusleo.nl',
    port: 3003
  },
    email: {
	subject_prefix: "[PlusLeo test]",
	alwaysTo: "arjen.haayman+plusleo@gmail.com"
    }
};
