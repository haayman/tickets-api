// const setupEnv = require("./startup/env");

global.DOCUMENT_ROOT = __dirname;

const app = require("./app");
const winston = require("winston");
const config = require("config");
const history = require("connect-history-api-fallback");
const globalData = require('./components/globalData');

app.use(history);

const port = config.get("server.port") || 3000;
app
  .listen(port, () => {
    winston.info(`listening on port ${port}`);
    // winston.info(`webhook: ${config.get("server.url")}`);

    require("./startup/env")();
  })
  .on("error", e => {
    winston.error(e);
  });