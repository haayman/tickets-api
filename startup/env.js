const config = require("config");
const winston = require("winston");

module.exports = new Promise((resolve, reject) => {
  // if (process.env.ENV !== "production") {
  //   const localtunnel = require("localtunnel");
  //   const port = config.get("server.port");
  //   const tunnel = localtunnel(port, (err, tunnel) => {
  //     if (err) {
  //       reject(new Error(err));
  //     }
  //     //   tunnel.request(info => {
  //     //     winston.info(info);
  //     //   });
  //     //   tunnel.error(error => {
  //     //     throw new Error(error);
  //     process.env.SERVER_URL = tunnel.url;
  //     winston.info(`Setting SERVER_URL to ${tunnel.url}`);
  //     resolve(true);
  //   });
  // } else {
  resolve(true);
  // }
});
