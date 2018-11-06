const express = require("express");
const users = require("../routes/users");
const voorstelling = require("../routes/voorstelling");
const reservering = require("../routes/reservering");
const uitvoering = require("../routes/uitvoering");
const log = require("../routes/log");
const auth = require("../routes/auth");
const payment = require("../routes/payment");
const errorHandler = require("../middleware/error");
const servername = require('../middleware/servername');
const setUser = require("../middleware/user");

module.exports = function (app) {
  app.use(errorHandler);
  app.all('*', servername);
  app.all('*', setUser)

  app.use(express.json());
  app.use(express.urlencoded({
    extended: true
  }));

  // routes
  // app.use("/roles", roles);
  app.use("/api/auth", auth);
  app.use("/api/user", users);
  app.use("/api/voorstelling", voorstelling);
  app.use("/api/uitvoering", uitvoering);
  app.use("/api/reservering", reservering);
  app.use("/api/log", log);
  app.use("/api/payment", payment);

  // static
  app.use("/dist", express.static(global.DOCUMENT_ROOT + "/dist"));

  // alle andere naar homepage
  app.use("/*", express.static(global.DOCUMENT_ROOT + "/public"));
};