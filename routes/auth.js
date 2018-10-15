const _ = require("lodash");
const express = require("express");
const { User } = require("../models");
const config = require("config");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/", async (req, res) => {
  const sendError = function(message = "Onbekende gebruiker of wachtwoord") {
    return res.status(400).send(message);
  };

  // standaard wordt password niet opgehaald. Doe nu maar wel
  let user = await User.scope("withPassword").findOne({
    where: { username: req.body.username }
  });
  if (!user) return sendError();

  const verified = await user.checkPassword(req.body.password);
  if (!verified) return sendError();

  const token = user.getAuthToken();
  res.header({ authorization: token }).send(user);
});

router.get("/CheckLoggedIn", async (req, res) => {
  let user = null,
    error = null;
  const token = req.header("x-auth-token");
  if (token) {
    try {
      user = jwt.verify(token, config.get("jwtPrivateKey"));
      user = await User.findById(user.id);
    } catch (e) {
      user = null;
      error = e.message;
    }
  }

  res.send({
    error: error,
    loggedIn: !!user,
    user: user
  });
});

module.exports = router;
