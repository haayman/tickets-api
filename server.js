// const setupEnv = require("./startup/env");

import loadApp from "./app";
import winston from "winston";
import config from "config";
import history from "connect-history-api-fallback";

(async function () {
  const app = await loadApp();
  app.use(history);

  const port = config.get("server.port") || 3000;
  app
    .listen(port, "0.0.0.0", () => {
      winston.info(`listening on port ${port}`);
      // winston.info(`webhook: ${config.get("server.url")}`);

      // require("./startup/env")();
    })
    .on("error", (e) => {
      winston.error(e);
    });
})();
