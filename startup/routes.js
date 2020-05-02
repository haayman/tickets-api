const express = require("express");
const cors = require("cors");
const auth = require("../routes/auth");
const users = require("../routes/users");
const voorstelling = require("../routes/voorstelling");
const reservering = require("../routes/reservering");
const uitvoering = require("../routes/uitvoering");
const log = require("../routes/log");
const payment = require("../routes/payment");
const iframe = require("../routes/iframe");
const mail = require("../routes/mail");
const errorHandler = require("../middleware/error");
// const servername = require('../middleware/servername');
const setUser = require("../middleware/user");
const favicon = require("serve-favicon");

module.exports = function(app) {
  app.set("view engine", "ejs");
  app.use(cors());

  // app.all('*', servername);
  app.all("*", setUser);

  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true
    })
  );

  // routes
  // app.use("/roles", roles);
  app.use("/api/auth", auth);
  app.use("/api/user", users);
  app.use("/api/voorstelling", voorstelling);
  app.use("/api/uitvoering", uitvoering);
  app.use("/api/reservering", reservering);
  app.use("/api/log", log);
  app.use("/api/payment", payment);
  app.use("/api/mail", mail);

  app.use("/iframe*", iframe);

  // // static
  // app.use("/dist", express.static(global.DOCUMENT_ROOT + "/dist"));

  // app.use("/css", express.static(global.DOCUMENT_ROOT + "/../src/styles"));

  // app.use(favicon(global.DOCUMENT_ROOT + "/public/favicon.ico"))

  // // alle andere naar homepage
  // app.use("/*", express.static(global.DOCUMENT_ROOT + "/public"));

  // error handler last
  app.use(errorHandler);
};
