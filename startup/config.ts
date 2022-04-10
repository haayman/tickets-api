import config from "config";

import helmet from "helmet";
import morgan from "morgan";

export default function (app) {
  app.use(helmet({ frameguard: false }));
  if (config.has("useMorgan") && config.get("useMorgan")) {
    app.use(morgan("combined"));
  }
}
