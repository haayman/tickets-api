const express = require("express");
const {
  User
} = require("../models");
const config = require("config");
const jwt = require("jsonwebtoken");
const checker = require('zxcvbn');
const router = express.Router();

router.post("/", async (req, res) => {
  const sendError = function (message = "Onbekende gebruiker of wachtwoord") {
    return res.status(400).send(message);
  };

  // standaard wordt password niet opgehaald. Doe nu maar wel
  let user = await User.scope("withPassword").findOne({
    where: {
      username: req.body.username
    }
  });
  if (!user) return sendError();

  const verified = await user.checkPassword(req.body.password);
  if (!verified) return sendError();

  const token = user.getAuthToken();
  res.header({
    authorization: token
  }).send(user);
});

router.get("/CheckLoggedIn", async (req, res) => {
  let user = null,
    error = null;
  let token = req.header("x-auth-token");
  if (token) {
    try {
      const data = jwt.verify(token, config.get("jwtPrivateKey"));
      // console.log('checkLoggedIn', data);
      user = await User.findByPk(data.id);
      if (user.tokenExpired(data.timestamp)) {
        user = token = null;
        error = "token expired";
      } else {
        token = user.getAuthToken(); // refresh token
        // console.log('refresh token', token);
      }
    } catch (e) {
      user = null;
      error = e.message;
      token = null;
    }
  }

  // console.log('header.authorization', token);
  res.header({
    authorization: token,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: 0
  }).send({
    error: error,
    loggedIn: !!user,
    user: user
  });
});

router.post("/checkPassword", async (req, res) => {
  const {
    password,
    userInputs
  } = req.body;
  const result = checker(password, userInputs);
  return res.send(result);
})

module.exports = router;
