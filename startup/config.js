const config = require("config");

const helmet = require("helmet");
const morgan = require("morgan");

module.exports = function (app) {
  app.use(helmet());
  if (config.has("useMorgan") && config.get("useMorgan")) {
    app.use(morgan("tiny"));
  }
};