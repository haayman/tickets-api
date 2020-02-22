/**
 * voeg de gegevens van de ingelogde gebruiker toe aan res.locals
 */

const jwt = require("jsonwebtoken");
const config = require("config");
const {
  User
} = require('../models');

module.exports = async function (req, res, next) {
  const token = req.get("x-auth-token");
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, config.get("jwtPrivateKey"));
    } catch (e) {}
  }
  res.locals.user = User.fromJson(user,{skipValidation:true})
  next();
};
