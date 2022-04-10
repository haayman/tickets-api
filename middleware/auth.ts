import jwt from "jsonwebtoken";
import config from "config";

export default function (authRequired: boolean | string[] = true) {
  return function (req, res, next) {
    try {
      const user = res.locals.user;
      const role = user.role;

      if (authRequired === true) {
        // just being logged in is sufficient
        next();
      } else if (
        Array.isArray(authRequired) &&
        authRequired.length &&
        authRequired.includes(role)
      ) {
        // needs specific role
        next();
      } else {
        return res.status(403).send("Access denied. Invalid role");
      }
    } catch (e) {
      res.status(400).send("Invalid token");
    }
  };
}
