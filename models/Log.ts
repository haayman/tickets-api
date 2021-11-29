import { basename } from "path";
import stackTrace from "stack-trace";
import {
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Reservering } from "./Reservering";

@Entity({ tableName: "logs" })
export class Log {
  constructor(message: string, sourceCode: string) {
    this.message = message;
    this.source_code = sourceCode;
  }

  @PrimaryKey()
  id: number;

  @Property()
  created_at = new Date();

  @Property()
  message: string;

  @Property()
  source_code: string;

  @ManyToOne()
  reservering!: Reservering;

  toString() {
    return this.message;
  }

  static addMessage(reservering: Reservering, message: string) {
    const trace = stackTrace.get();
    const caller = trace[1];

    const log = new Log(
      message,
      `${basename(caller.getFileName())}(${caller.getLineNumber()})`
    );

    reservering.logs.add(log);
  }
}
