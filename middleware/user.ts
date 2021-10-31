/**
 * voeg de gegevens van de ingelogde gebruiker toe aan res.locals
 */

import jwt from "jsonwebtoken";
import config from "config";
import { wrap } from "@mikro-orm/core";
import { User } from "../models";

export default async function (req, res, next) {
  const token = (req.get("Authorization") || "").replace("Bearer ", "");
  let userData = null;
  if (token) {
    try {
      userData = jwt.verify(token, config.get("jwtPrivateKey"));
    } catch (e) {}
    const user = new User();
    res.locals.user = wrap(user).assign(userData);
  }
  next();
}
