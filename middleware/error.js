const winston = require("winston");

module.exports = function(err, req, res, next) {
  winston.error(JSON.stringify(err));
  if (process.env.ENV !== "live") {
    res.status(500).send(JSON.stringify(err));
  } else {
    res.status(500).send("Er ging iets goed fout helaas");
  }
};
