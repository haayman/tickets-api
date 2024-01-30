import format from "date-fns/format";
import nl from "date-fns/locale/nl";
import {
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
import { Voorstelling } from "./Voorstelling";
import { Reservering } from "./Reservering";
import { Ticket } from "./Ticket";
import { EntityManager } from "@mikro-orm/mysql";
import winston from "winston";
import Container from "typedi";
import { Queue } from "bullmq";

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

  // @AfterUpdate()
  // triggerUpdated() {
  //   const queue: Queue = Container.get("verwerkWachtlijstQueue");
  //   queue.add("verwerkWachtlijst", this.id, {
  //     attempts: 3,
  //     backoff: {
  //       type: "exponential",
  //       delay: 1000,
  //     },
  //   });
  // }

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

  async countGereserveerd(em: EntityManager, reservering_id): Promise<number> {
    try {
      const connection = em.getConnection();
      const result = await connection.execute(
        `
      SELECT count(*) as count FROM tickets 
      WHERE reservering_id in 
      (select id from reserveringen where uitvoering_id = ? and not wachtlijst) 
      and reservering_id <> ? 
      and not tekoop 
      and saldo <= 0
      and not geannuleerd 
      AND not verkocht`,
        [this.id, reservering_id]
      );

      // @ts-ignore
      const count = result[0].count;
      return count;
    } catch (e) {
      winston.error(e);
      throw e;
    }
  }

  async countVrijePlaatsen(em: EntityManager, reservering_id: string) {
    try {
      return Math.max(
        this.aantal_plaatsen -
          (await this.countGereserveerd(em, reservering_id)),
        0
      );
    } catch (e) {
      throw e;
    }
  }

  @Property({ persist: false })
  get status(): string {
    const wachtlijst = this.wachtlijst;
    const vrije_plaatsen = this.vrije_plaatsen;
    const tekoop = this.te_koop;
    const retval: string[] = [];

    if (vrije_plaatsen) {
      retval.push( `<span>${vrije_plaatsen} vrije plaats${
        vrije_plaatsen == 1 ? "" : "en"
      }</span>`);
    } else {
      retval.push(`<b>Uitverkocht</b>`);
    }

    if (!vrije_plaatsen || wachtlijst) {
      retval.push( ` <span>wachtlijst: ${wachtlijst || 0}</span>`);
    }
    if (tekoop) {
      retval.push( ` te koop: ${tekoop}`);
    }

    return retval.join(", ");
  }

  countTickets(options: {
    tekoop?: boolean;
    reservering_id?: string;
    wachtlijst?: boolean;
  }) {
    let tickets = this.tickets;

    if (options.tekoop !== undefined) {
      tickets = tickets.filter((t) => !!t.tekoop == !!options.tekoop);
    }

    if (options.reservering_id) {
      tickets = tickets.filter(
        (t) => t.reservering.id !== options.reservering_id
      );
    }
    if (options.wachtlijst !== undefined) {
      tickets = tickets.filter(
        (t) => !!t.reservering.wachtlijst == !!options.wachtlijst
      );
    }

    return tickets.length;
  }

  toString() {
    // https://date-fns.org/v2.0.0-alpha.9/docs/format
    return `${this.extra_text || ""} ${format(
      this.aanvang,
      "EEEE d MMM HH:mm",
      { locale: nl }
    )}`;
  }
}
