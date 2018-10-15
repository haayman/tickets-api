const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function(req, res, next) {
  const token = req.get("x-auth-token");
  if (!token) {
    req.user = null;
    next();
  } else {
    try {
      const user = jwt.verify(token, config.get("jwtPrivateKey"));

      // // sla user op in res.localsuest
      req.user = user;
      next();
    } catch (e) {
      req.user = null;
      next();
    }
  }
};
