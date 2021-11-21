import format from "date-fns/format";
import nl from "date-fns/locale/nl";
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
import { Voorstelling } from "./Voorstelling";
import { Reservering } from "./Reservering";
import { Ticket } from "./Ticket";

export type UitvoeringDTO = {
  aantal_plaatsen: number;
  aanvang: Date;
  deur_open: Date;
  extra_text?: string;
};

@Entity({ tableName: "uitvoeringen" })
export class Uitvoering {
  constructor({
    aantal_plaatsen,
    aanvang,
    deur_open,
    extra_text,
  }: UitvoeringDTO) {
    this.aantal_plaatsen = aantal_plaatsen;
    this.aanvang = new Date(aanvang);
    this.deur_open = new Date(deur_open);
    this.extra_text = extra_text;
  }

  @PrimaryKey()
  public id!: number;

  @Property()
  aantal_plaatsen!: number;

  @Property()
  aanvang = new Date();

  @Property()
  deur_open = new Date();

  @Property()
  extra_text?: string;

  // ------------------- updated by triggers ----------
  @Property()
  gereserveerd: number = 0;

  @Property()
  wachtlijst: number = 0;

  @Property()
  te_koop: number = 0;

  @Property()
  vrije_plaatsen: number = 0;

  // /------------------- updated by triggers ----------

  @ManyToOne()
  voorstelling!: Voorstelling;

  @OneToMany(() => Reservering, (reservering) => reservering.uitvoering)
  reserveringen = new Collection<Reservering>(this);

  @Property({ persist: false })
  get tickets(): Ticket[] {
    return this.reserveringen.isInitialized()
      ? this.reserveringen.getItems().reduce((tickets, reservering) => {
          return tickets.concat(reservering.tickets);
        }, [])
      : undefined;
  }

  // toJSON(strict = true, strip = [], ...args: any[]): { [p: string]: any } {
  //   const o = wrap(this, true).toObject(...args);

  //   o.gereserveerd = this.gereserveerd();
  //   o.wachtlijst = this.wachtlijst();
  //   o.tekoop = this.tekoop();
  //   o.vrije_plaatsen = this.vrije_plaatsen();

  //   if (strict) {
  //     strip.forEach((k) => delete o[k]);
  //   }

  //   return o;
  // }

  // gereserveerd(reservering_id?: string) {
  //   const gereserveerd = this.countTickets({
  //     wachtlijst: false,
  //     reservering_id: reservering_id,
  //   });
  //   return gereserveerd;
  // }

  // wachtlijst(reservering_id = null) {
  //   const wachtlijst = this.countTickets({
  //     wachtlijst: true,
  //     reservering_id,
  //   });
  //   return wachtlijst;
  // }

  // tekoop() {
  //   const tekoop = this.countTickets({
  //     tekoop: true,
  //   });
  //   return tekoop;
  // }

  // vrije_plaatsen(reservering_id = null) {
  //   return Math.max(
  //     this.aantal_plaatsen - this.gereserveerd(reservering_id) + this.tekoop(),
  //     0
  //   );
  // }

  @Property({ persist: false })
  get status(): string {
    const wachtlijst = this.wachtlijst;
    const vrije_plaatsen = this.vrije_plaatsen;
    const tekoop = this.te_koop;
    let retval: string;

    if (vrije_plaatsen) {
      retval = `<span>${vrije_plaatsen} vrije plaats${
        vrije_plaatsen == 1 ? "" : "en"
      }</span>`;
    } else {
      retval = `<b>Uitverkocht</b>`;
    }

    if (!vrije_plaatsen || wachtlijst) {
      retval += ` <span>wachtlijst: ${wachtlijst || 0}</span>`;
    }
    if (tekoop) {
      retval += ` te koop: ${tekoop}`;
    }

    return retval;
  }

  // countTickets(options: {
  //   tekoop?: boolean;
  //   reservering_id?: string;
  //   wachtlijst?: boolean;
  // }) {
  //   let tickets = this.tickets;

  //   if (options.tekoop !== undefined) {
  //     tickets = tickets.filter((t) => !!t.tekoop == !!options.tekoop);
  //   }

  //   if (options.reservering_id) {
  //     tickets = tickets.filter(
  //       (t) => t.reservering.id !== options.reservering_id
  //     );
  //   }
  //   if (options.wachtlijst !== undefined) {
  //     tickets = tickets.filter(
  //       (t) => !!t.reservering.wachtlijst == !!options.wachtlijst
  //     );
  //   }

  //   return tickets.length;
  // }

  toString() {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text || ""} ${format(
      this.aanvang,
      "EEEE d MMM HH:mm",
      { locale: nl }
    )}`;
  }
}
