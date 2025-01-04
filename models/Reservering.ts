import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import config from "config";
import { v4 } from "uuid";
import {
  Collection,
  Entity,
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
import {
  getMailUrl,
  getBetalingUrl,
  getEditLink,
  getQrUrl,
  getResendUrl,
  getTicketUrl,
} from "../components/urls";
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
    const promises = [
      ...this.payments.getItems().map((p) => p.finishLoading()),
      ...this.tickets.getItems().map((t) => t.finishLoading()),
    ];
    try {
      await Promise.all(promises);
    } catch (e) {
      throw e;
    }
  }

  get ticketAggregates() {
    return Object.values(new TicketAggregator(this).aggregates);
  }

  get validTickets() {
    if (!this.tickets.isInitialized()) return undefined;
    return this.tickets.getItems().filter((t) => t.isValid);
  }

  get onbetaaldeTickets() {
    return this.validTickets?.filter((t) => t.isPaid !== true && t.bedrag);
  }

  get newPaymentNeeded() {
    return (
      !this.wachtlijst &&
      this.onbetaaldeTickets.length &&
      this.payments.getItems().filter((p) => p.status == "open").length == 0
    );
  }

  @Property({ persist: false })
  get saldo() {
    return this.validTickets
      ? Ticket.totaalSaldo(this.validTickets)
      : undefined;
  }

  @Property({ persist: false })
  get openstaandBedrag() {
    return -this.saldo;
  }

  @Property({ persist: false })
  get bedrag() {
    if (!this.tickets.isInitialized()) {
      winston.debug("bedrag undefined");
      return undefined;
    }
    return this.validTickets?.reduce(
      (bedrag, t: Ticket) => bedrag + +t.bedrag,
      0
    );
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

    return this.validTickets?.length;
  }

  async moetInWachtrij(em: EntityManager, existing: boolean): Promise<boolean> {
    try {
      if (existing) {
        // tel het aantal vrije plaatsen als je deze reservering niet meetelt
        const vrije_plaatsen = await this.uitvoering.countVrijePlaatsen(
          // @ts-ignore
          em,
          this.id
        );
        return vrije_plaatsen < this.aantal;
      } else {
        const vrije_plaatsen = this.uitvoering.vrije_plaatsen;
        return vrije_plaatsen < this.aantal;
      }
    } catch (e) {
      throw e;
    }
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
    const days = config.get<number>("teruggave_termijn");
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
