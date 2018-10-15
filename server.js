// const setupEnv = require("./startup/env");

global.DOCUMENT_ROOT = __dirname;

// setupEnv.then(() => {
const app = require("./app");
const winston = require("winston");
const config = require("config");
const history = require("connect-history-api-fallback");

app.use(history);

const port = config.get("server.port") || 3000;
app
  .listen(port, () => {
    winston.info(`running in ENV ${process.env.ENV} `);
    winston.info(`listening on port ${port}`);
    winston.info(`webhook: ${config.get("server.url")}`);
  })
  .on("error", e => {
    winston.error(e);
    //app.close();
  });
// });
