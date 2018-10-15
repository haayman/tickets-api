const express = require("express");
const winston = require("winston");

const app = express();

// don't read from the root
process.env.NODE_CONFIG_DIR = __dirname + "/config/";
// require("./startup/env")();
require("./startup/config")(app);

require("./startup/logging")();
// require("./startup/database")();
require("./startup/routes")(app);

module.exports = app;
