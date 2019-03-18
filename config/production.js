// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: "My app (dev)",
  useMorgan: true,
  payment: {
    mollie_key: "live_hWpJh2wNJCk8pBm5GruCpdqDEkJGdr"
  },
  server: {
    url: "https://kaarten.plusleo.nl",
    port: 3000
  },
};
