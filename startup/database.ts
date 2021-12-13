import { LoadStrategy, MikroORM } from "@mikro-orm/core";
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

export default async function (): Promise<void> {
  const type: string = config.get("database.client");
  const {
    host,
    user,
    database: dbName,
    password,
  } = config.get("database.connection");
  const orm = await MikroORM.init({
    metadataProvider: TsMorphMetadataProvider,
    host,
    user,
    password,
    dbName,
    type: "mysql",
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
    // debug: ["info"],
    debug: true,
    options: {
      cacheDir: tmpdir(),
    },
    // debug: ["info"],
  });
  console.log("db set");
  Container.set("em", orm.em);
}
