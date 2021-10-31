import format from "date-fns/format";
import nl from "date-fns/locale/nl";
import { v4 } from "uuid";
import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Uitvoering } from "./Uitvoering";
import { Log } from "./Log";
import { Ticket } from "./Ticket";
import { Payment } from "./Payment";
import { StatusUpdate } from "./StatusUpdate";

@Entity({ tableName: "reserveringen" })
export class Reservering {
  @PrimaryKey()
  public id = v4();

  @Property()
  naam!: string;

  @Property()
  email!: string;

  @Property()
  opmerking: string;

  @Property()
  opmerking_gebruiker: string;

  @Property()
  wachtlijst: boolean = false;

  @Property()
  ingenomen?: Date;

  @Property()
  saldo: number;

  @ManyToOne({ onDelete: "cascade" })
  uitvoering!: Uitvoering;

  @OneToMany(() => Ticket, (ticket) => ticket.reservering)
  tickets = new Collection<Ticket>(this);

  @OneToMany(() => Log, (log) => log.reservering)
  logs = new Collection<Log>(this);

  @OneToMany(() => StatusUpdate, (statusupdate) => statusupdate.reservering)
  statusupdates = new Collection<StatusUpdate>(this);

  @OneToMany(() => Payment, (payment) => payment.reservering)
  payments = new Collection<Payment>(this);

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();

  toString() {
    return `${this.aantal}x ${this.uitvoering}`;
  }

  get bedrag() {
    return this.tickets
      .getItems()
      .reduce((bedrag, t: Ticket) => bedrag + t.bedrag, 0);
  }

  // dummy setter
  set bedrag(value) {
    //this.bedrag = value;
  }

  /**
   * aantal gereserveerde plaatsen
   */
  get aantal() {
    return this.tickets.length;
  }
}
