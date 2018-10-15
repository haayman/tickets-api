const express = require("express");
const users = require("../routes/users");
const voorstelling = require("../routes/voorstelling");
const reservering = require("../routes/reservering");
const auth = require("../routes/auth");
const errorHandler = require("../middleware/error");
//const setUser = require("../middleware/user");

module.exports = function(app) {
  app.use(errorHandler);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // routes
  // app.use("/roles", roles);
  app.use("/api/auth", auth);
  app.use("/api/user", users);
  app.use("/api/voorstelling", voorstelling);
  app.use("/api/reservering", reservering);

  // static
  app.use("/dist", express.static(global.DOCUMENT_ROOT + "/dist"));

  // alle andere naar homepage
  app.use("/*", express.static(global.DOCUMENT_ROOT + "/public"));
};
