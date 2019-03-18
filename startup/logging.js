"use strict";

const winston = require("winston"); // logging
const config = require("config");
require("express-async-errors");

module.exports = function () {
  // const logger = winston.createLogger({
  //   level: "info",
  //   debug: true,
  //   // format: winston.format.json(),
  //   transports: [
  //     //
  //     // - Write to all logs with level `info` and below to `combined.log`
  //     // - Write all logs error (and below) to `error.log`.
  //     //
  //     // new winston.transports.File({ filename: "error.log", level: "error" }),
  //     // new winston.transports.File({ filename: "combined.log", level: "info" })
  //     // new winston.transports.MongoDB({
  //     //   db: config.get("database.connection"),
  //     //   capped: true
  //     // })
  //   ]
  // });

  // //
  // // If we're not in production then log to the `console` with the format:
  // // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  // //
  // if (process.env.NODE_ENV !== "production") {
  //   logger.add(
  //     new winston.transports.Console({
  //       format: winston.format.simple(),
  //       prettyPrint: true,
  //       colorize: true,
  //       level: "info"
  //     })
  //   );
  // }

  // https://github.com/winstonjs/winston/issues/1243
  function replaceErrors(key, value) {
    if (value instanceof Buffer) {
      return value.toString("base64");
    } else if (value instanceof Error) {
      var error = {};

      Object.getOwnPropertyNames(value).forEach(function (key) {
        error[key] = value[key];
      });

      return error;
    }

    return value;
  }

  const logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.json({
        replacer: replaceErrors
      })
    ),
    transports: [new winston.transports.Console()]
  });

  winston.configure({
    format: winston.format.combine(
      winston.format.json({
        replacer: replaceErrors
      })
    ),
    transports: [
      new winston.transports.Console({
        // format: winston.format.simple(),
        prettyPrint: true,
        colorize: true,
        level: "info"
      }),
      // new winston.transports.File({
      //   filename: "error.log",
      //   level: "error"
      // })
    ]
  });

  process.on("uncaughtException", ex => {
    winston.error(ex);
    // process.exit(1);
  });

  process.on("unhandledRejection", ex => {
    winston.error(ex);
    // process.exit(1);
  });
};