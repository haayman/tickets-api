import winston from "winston";

module.exports = function(port) {
  return new Promise((resolve, reject) => {
    if (process.env.ENV !== "production") {
      const localtunnel = require("localtunnel");
      const tunnel = localtunnel(port, (err, tunnel) => {
        if (err) {
          reject(new Error(err));
        }
        tunnel.request(info => {
          winston.info(info);
        });
        tunnel.error(err => {
          throw new Error(err);
        });
        resolve(tunnel.url);
      });
    } else {
      resolve(true);
    }
  });
};
