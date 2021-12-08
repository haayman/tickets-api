const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../models/User");

module.exports = function(authRequired = true) {
  return function(req, res, next) {
    //@TODO
    //always true
    // next();

    const token = (req.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return res.status(401).send("Access denied. No token provided");

    try {
      const user = jwt.verify(token, config.get("jwtPrivateKey"));
      const role = user.role;

      if (authRequired === true) {
        // just being logged in is sufficient
        next();
      } else if (authRequired.length && authRequired.includes(role)) {
        // needs specific role
        next();
      } else {
        return res.status(403).send("Access denied. Invalid role");
      }
    } catch (e) {
      res.status(400).send("Invalid token");
    }
  };
};
