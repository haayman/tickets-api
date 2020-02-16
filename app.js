global.DOCUMENT_ROOT = __dirname;

// don't read from the root
process.env.NODE_CONFIG_DIR = __dirname + '/config/';

console.log(process.env.NODE_CONFIG_DIR);

const express = require('express');
const app = express();

//process.env.DEBUG = 'knex:query';

require('./startup/config')(app);

require('./startup/logging')();
require('./startup/database')();
require('./startup/routes')(app);

// require("./startup/env")();

module.exports = app;
