import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import config from "config";
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
import { TicketAggregator } from "../helpers/TicketAggregator";

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

  @ManyToOne({ onDelete: "cascade" })
  uitvoering!: Uitvoering;

  @OneToMany(() => Ticket, (ticket) => ticket.reservering, {
    orphanRemoval: true,
  })
  tickets = new Collection<Ticket>(this);

  @OneToMany(() => Log, (log) => log.reservering)
  logs = new Collection<Log>(this);

  @OneToMany(() => StatusUpdate, (statusupdate) => statusupdate.reservering)
  statusupdates = new Collection<StatusUpdate>(this);

  @OneToMany(() => Payment, (payment) => payment.reservering)
  payments = new Collection<Payment>(this);

  @Property()
  created_at = new Date();

  @Property({ onUpdate: () => new Date() })
  updated_at = new Date();

  toString() {
    return `${this.aantal}x ${this.uitvoering}`;
  }

  toJSON(strict = true, strip = [], ...args: any[]) {
    const o = wrap(this, true).toObject(...args);
    for (const field of [
      "bedrag",
      "aantal",
      "moetInWachtrij",
      "teruggeefbaar",
      "paymentUrl",
    ]) {
      o[field] = this[field];
    }
    o.tickets = new TicketAggregator(this).toJSON();
    return o;
  }

  // get saldo() {
  //   // bereken het totaal betaalde bedrag
  //   if (!this.payments) {
  //     return undefined;
  //   }

  //   // totaal betaald
  //   let saldo = this.payments.getItems().reduce((saldo, payment) => {
  //     // if (!payment.payment && payment.paymentId) {
  //     //   debugger;
  //     //   throw new Error("payment not initialized");
  //     // }
  //     if (payment.isPaid) {
  //       return saldo + (+payment.amount - (payment.amountRefunded || 0));
  //     } else {
  //       return saldo;
  //     }
  //   }, 0);

  //   // bereken kosten van alle te betalen tickets
  //   saldo = this.tickets.getItems()
  //     .filter((t) => !t.tekoop)
  //     .reduce((saldo, t) => saldo - t.bedrag, saldo);
  //   // saldo = this.TicketHandlers.reduce((saldo, ta) => {
  //   //   return saldo - ta.getBedrag(ta.aantal - ta.aantaltekoop);
  //   // }, saldo);

  //   return saldo;
  // }

  get bedrag() {
    return this.tickets
      .getItems()
      .reduce((bedrag, t: Ticket) => bedrag + +t.bedrag, 0);
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

  get moetInWachtrij() {
    const vrije_plaatsen = this.uitvoering.vrije_plaatsen;
    return this.id ? vrije_plaatsen < this.aantal : vrije_plaatsen <= 0;
  }

  /**
   * Bepaal of de uitvoering binnen de teruggave_termijn valt
   */
  get teruggeefbaar() {
    if (!this.uitvoering) {
      return undefined;
    }
    const today = new Date();
    const days = config.get("teruggave_termijn");
    const diff = differenceInCalendarDays(this.uitvoering.aanvang, today);

    return diff > days;
  }

  @Property({ persist: false })
  get paymentUrl() {
    if (!this.payments) {
      return undefined;
    }
    let payment;
    if ((payment = this.payments.getItems().find((p) => p.paymentUrl))) {
      return payment.paymentUrl;
    }
    return undefined;
  }
}
