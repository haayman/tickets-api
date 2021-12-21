import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import config from "config";
import { v4 } from "uuid";
import {
  AfterCreate,
  AfterDelete,
  AfterUpdate,
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
import { Aggregate, TicketAggregator } from "../helpers/TicketAggregator";
import {
  getMailUrl,
  getBetalingUrl,
  getEditLink,
  getQrUrl,
  getResendUrl,
  getTicketUrl,
} from "../components/urls";
import { queue } from "../startup/queue";
import winston from "winston";
import { EntityManager } from "@mikro-orm/core";

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
  status?: string;

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
    if (this.tickets.isInitialized()) {
      o.tickets = new TicketAggregator(this).toJSON();
    }
    return o;
  }

  async finishLoading() {
    for (const payment of this.payments.getItems()) {
      await payment.finishLoading();
    }
    for (const ticket of this.tickets.getItems()) {
      await ticket.finishLoading();
    }
  }

  get ticketAggregates() {
    return Object.values(new TicketAggregator(this).aggregates);
  }

  get onbetaaldeTickets() {
    if (!this.tickets.isInitialized()) return undefined;
    return this.tickets.getItems().filter((t) => t.isPaid !== true && t.bedrag);
  }

  get newPaymentNeeded() {
    return (
      !this.wachtlijst &&
      this.onbetaaldeTickets.length &&
      this.payments.getItems().filter((p) => p.status == "open").length == 0
    );
  }

  @AfterCreate()
  @AfterDelete()
  triggerUpdated() {
    // @ts-ignore
    queue.emit("reserveringUpdated", this.id);
  }

  @Property({ persist: false })
  get openstaandBedrag() {
    if (!this.payments.isInitialized()) {
      return undefined;
    }
    return Math.max(0, -this.saldo);
  }

  @Property({ persist: false })
  get saldo() {
    // bereken het totaal betaalde bedrag
    if (!this.payments.isInitialized() || !this.tickets.isInitialized()) {
      winston.debug(`saldo: payments or tickets not initialized`);
      return undefined;
    }

    // totaal betaald
    let saldo = this.payments.getItems().reduce((saldo, payment) => {
      if (payment.isPaid) {
        return saldo + (+payment.amount - (payment.amountRefunded || 0));
      } else {
        return saldo;
      }
    }, 0);

    // bereken kosten van alle te betalen tickets
    saldo = this.tickets
      .getItems()
      .filter((t) => !t.tekoop)
      .filter((t) => !t.terugbetalen)
      .reduce((saldo, t) => saldo - t.bedrag, saldo);
    // saldo = this.TicketHandlers.reduce((saldo, ta) => {
    //   return saldo - ta.getBedrag(ta.aantal - ta.aantaltekoop);
    // }, saldo);

    return saldo;
  }

  @Property({ persist: false })
  get bedrag() {
    if (!this.tickets.isInitialized()) {
      winston.debug("bedrag undefined");
      return undefined;
    }
    return this.tickets
      ?.getItems()
      .reduce((bedrag, t: Ticket) => bedrag + +t.bedrag, 0);
  }

  // dummy setter
  set bedrag(value) {
    //this.bedrag = value;
  }

  /**
   * aantal gereserveerde plaatsen
   */
  @Property({ persist: false })
  get aantal() {
    if (!this.tickets.isInitialized()) {
      winston.debug("aantal undefined");
      return undefined;
    }

    return this.tickets.length;
  }

  async moetInWachtrij(em: EntityManager, existing: boolean): Promise<boolean> {
    const vrije_plaatsen = this.uitvoering.vrije_plaatsen;
    return existing
      ? // @ts-ignore
        (await this.uitvoering.countVrijePlaatsen(em, this.id)) <= 0
      : vrije_plaatsen <= 0;
  }

  setStatus(status: string) {
    this.status = status;
    this.statusupdates.add(new StatusUpdate(status));
  }

  /**
   * Bepaal of de uitvoering binnen de teruggave_termijn valt
   */
  @Property({ persist: false })
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
    let paymentUrl;
    if (!this.payments.isInitialized()) {
      return undefined;
    }
    if (this.payments) {
      let payment;
      if ((payment = this.payments.getItems().find((p) => p.paymentUrl))) {
        paymentUrl = payment.paymentUrl;
      }
    }
    winston.debug(`paymentUrl: ${paymentUrl}`);
    return paymentUrl;
  }

  getMailUrl(template: string) {
    return getMailUrl(this.id, template);
  }
  getBetalingUrl() {
    return getBetalingUrl(this.id);
  }
  getEditLink() {
    return getEditLink(this.id);
  }
  getQrUrl() {
    return getQrUrl(this.id);
  }
  getResendUrl() {
    return getResendUrl(this.id);
  }
  getTicketUrl() {
    return getTicketUrl(this.id);
  }

  static populate() {
    return [
      "uitvoering.voorstelling.prijzen",
      "tickets.payment",
      "tickets.prijs",
      "payments",
      "logs",
      "statusupdates",
    ];
  }
}
