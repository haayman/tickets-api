// const server_url = require("./server_url");
const defer = require("config/defer").deferConfig;

const port =

  module.exports = {
    name: "My app (dev)",
    useMorgan: true,
    payment: {
      mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
    },
    server: {
      url: defer(function () {
        const port = this.port || 3000;
        return `http://devcom:${port}`
      })
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
  };