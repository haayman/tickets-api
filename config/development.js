// const server_url = require("./server_url");
// const defer = require("config/defer").deferConfig;

module.exports = {
  name: "My app (dev)",
  useMorgan: true,
  payment: {
    mollie_key: "test_DMVExh3QMmTN6tjUku59cjPzQJNhf8"
  },
  server: {
    url: "https://plusleo.localtunnel.me"
  },
  // mail_transport: {
  //   host: "smtp.bhosted.nl",
  //   port: 587,
  //   secure: false
  //   // auth: {
  //   //   user: account.user,
  //   //   pass: account.pass
  //   // }
  // }
  mail_transport: {
    debug: true,
    logger: true,
    host: "smtp.t-mobilethuis.nl",
    port: 465,
    secure: true,
    auth: {
      user: "plusleo@t-mobilethuis.nl",
      pass: "u9cW^nCG5RMNT6e@HZS1jE@"
    }
  }
};
