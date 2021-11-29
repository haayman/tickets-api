/*
  init: 'open',
  transitions: [
    name: 'betaal', from: 'open', to: 'betaald',
    name: 'annuleer', from ['betaald','open'] to 'geannuleerd',
    name: 'verkoop', from:'betaald', to: 'tekoop',
  ]

  'betaald'
  'geannuleerd'
  'tekoop'
  'terugtebetalen'
  'terugbetaald'
  'verkocht'
*/
import {
  Entity,
  Filter,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Payment } from "./Payment";
import { Prijs } from "./Prijs";
import { Reservering } from "./Reservering";

// negeer alle verkochte en geannuleerde tickets
@Filter({
  name: "valid",
  cond: { verkocht: false, geannuleerd: false },
  default: true,
})
@Entity({ tableName: "tickets" })
export class Ticket {
  constructor(prijs: Prijs, betaald: boolean) {
    this.prijs = prijs;
    this.betaald = betaald;
  }

  @PrimaryKey()
  public id!: number;

  @Property()
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property()
  deleted_at: Date;

  @Property()
  betaald: boolean = false;

  @Property()
  tekoop: boolean = false;

  @Property()
  geannuleerd: boolean = false;

  @Property()
  verkocht: boolean = false;

  @Property()
  terugbetalen: boolean = false;

  @Property({ persist: false })
  get bedrag() {
    if (!this.prijs) {
      throw new Error("geen prijs");
    }
    return this.prijs.prijs;
  }

  @Property({ persist: false })
  get isPaid() {
    return this.payment && this.payment.isPaid;
  }

  @ManyToOne({ hidden: true })
  reservering: Reservering;

  @ManyToOne()
  prijs: Prijs;

  @ManyToOne()
  payment: Payment;

  toString() {
    return `1x ${this.prijs}`;
  }

  /**
   * Maak een beschrijving van een groep tickets
   * @param {Ticket[]} tickets
   * @returns {string}
   */
  static description(
    tickets: Pick<Ticket, "prijs">[],
    separator = "\n"
  ): string {
    // Tel aantal tickets per prijs
    const counter: {
      [key: number]: {
        count: number;
        prijs: Prijs;
        bedrag: number;
      };
    } = {};
    // await Promise.all(tickets.map(async t => {
    tickets.forEach((t) => {
      // t.prijs = await t.getPrijs();
      if (!counter[t.prijs.id]) {
        counter[t.prijs.id] = {
          prijs: t.prijs,
          count: 0,
          bedrag: 0,
        };
      }
      counter[t.prijs.id].count++;
    });

    return Object.values(counter)
      .map((c) => {
        const totaal = (c.count * c.prijs.prijs).toFixed(2);
        const count = c.count;
        return `${count}x ${c.prijs}: €${totaal}`;
      })
      .join(separator);
  }

  /**
   * bereken totaalbedrag over een set tickets
   * @param {*} tickets
   */
  static totaalBedrag(tickets: Ticket[]): number {
    return tickets.reduce((totaal, t) => totaal + t.prijs.prijs, 0);
  }
}
