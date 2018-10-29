const express = require("express");
const app = express();

// don't read from the root
process.env.NODE_CONFIG_DIR = __dirname + "/config/";
require("./startup/config")(app);

require("./startup/logging")();
// require("./startup/database")();
require("./startup/routes")(app);

module.exports = app;
