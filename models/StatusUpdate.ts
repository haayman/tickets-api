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

@Entity({ tableName: "statusupdates" })
export class StatusUpdate {
  @PrimaryKey()
  public id!: number;

  @Property()
  created_at = new Date();

  @Property()
  status: string;

  @ManyToOne()
  reservering!: Reservering;

  toString() {
    return this.status;
  }
}
