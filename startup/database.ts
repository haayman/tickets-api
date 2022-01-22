import { LoadStrategy, MikroORM } from "@mikro-orm/core";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { EntityManager } from "@mikro-orm/mariadb";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import config from "config";
import Container from "typedi";
import { tmpdir } from "os";
import {
  Log,
  Payment,
  Prijs,
  Reservering,
  StatusUpdate,
  Ticket,
  Uitvoering,
  User,
  Voorstelling,
} from "../models";
import winston from "winston";

export default async function (): Promise<void> {
  try {
    const type: string = config.get("database.client");
    const {
      host,
      user,
      database: dbName,
      password,
      debug,
    } = config.get("database.connection");
    const orm = await MikroORM.init({
      metadataProvider: TsMorphMetadataProvider,
      host,
      user,
      password,
      dbName,
      type: "mysql",
      highlighter: new SqlHighlighter(),
      entities: [
        Log,
        Payment,
        Prijs,
        Reservering,
        StatusUpdate,
        Ticket,
        Uitvoering,
        User,
        Voorstelling,
      ],
      loadStrategy: LoadStrategy.SELECT_IN,
      tsNode: true,
      validate: true,
      debug,
      options: {
        cacheDir: tmpdir(),
      },
    });
    winston.info("db set");
    Container.set("em", orm.em);
  } catch (e) {
    throw e;
  }
}
