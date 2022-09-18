import express from "express";
import { User } from "../models/User";
import config from "config";
import jwt from "jsonwebtoken";
import checker from "zxcvbn";
import { getRepository } from "../models/Repository";
const router = express.Router();

router.post("/", async (req, res) => {
  const userRepository = getRepository<User>("User");
  const sendError = function (message = "Onbekende gebruiker of wachtwoord") {
    return res.status(401).send({ message });
  };

  // standaard wordt password niet opgehaald. Doe nu maar wel
  let user = await userRepository.findOne({
    username: req.body.username,
  });
  if (!user) return sendError();

  const verified = await user.checkPassword(req.body.password);
  if (!verified) return sendError();

  const token = user.getAuthToken();
  res.send({ token });
});

router.get("/me", async (req, res) => {
  const userRepository = getRepository<User>("User");
  let user = null,
    error = null;
  let token = (req.header("Authorization") || "").replace("Bearer ", "");
  if (token) {
    try {
      const data = jwt.verify(token, config.get("jwtPrivateKey"));
      // console.log('checkLoggedIn', data);
      user = await userRepository.findOne(data.id);
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
  res
    // .header({
    //   authorization: token,
    //   "Cache-Control": "no-cache, no-store, must-revalidate",
    //   Pragma: "no-cache",
    //   Expires: 0
    // })
    .send({
      error: error,
      loggedIn: !!user,
      user: user,
      token: token,
    });
});

router.post("/checkPassword", async (req, res) => {
  const { password, userInputs } = req.body;
  const result = checker(password, userInputs);
  return res.send(result);
});

export default router;
