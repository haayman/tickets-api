global.DOCUMENT_ROOT = __dirname;

// don't read from the root
process.env.NODE_CONFIG_DIR = __dirname + "/config/";

import "reflect-metadata";
import express from "express";
import config from "./startup/config";
import logging from "./startup/logging";
import database from "./startup/database";
import routes from "./startup/routes";
import queue from "./startup/queue";
import di from "./startup/di";

export default async function () {
  const app = express();

  //process.env.DEBUG = 'knex:query';

  config(app);

  logging();
  di();
  await database();
  await queue();
  routes(app);

  return app;
}
