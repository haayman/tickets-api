import winston from "winston";

export default function (err, req, res, next) {
  winston.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  if (process.env.ENV !== "live") {
    res.status(500).send(JSON.stringify(err));
  } else {
    res.status(500).send("Er ging iets goed fout helaas");
  }
}
