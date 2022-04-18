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
  ManyToOne,
  OnInit,
  PrimaryKey,
  Property,
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
  constructor(prijs: Prijs, betaald: boolean, saldo: number) {
    this.prijs = prijs;
    this.betaald = betaald;
    this.saldo = saldo;
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
  saldo: number = 0;

  get openstaandBedrag() {
    return -this.saldo;
  }

  get isValid() {
    return !this.verkocht && !this.geannuleerd && !this.terugBetalen;
  }

  /**
   * het ticket wordt bijna terugbetaald, maar dat is nog niet gebeur
   */
  get terugBetalen() {
    return this.saldo > 0;
  }

  @OnInit()
  toNumeric() {
    // terugbetalen is als 'decimal' opgeslagen, wat mikro-orm niet herkent
    this.saldo = +this.saldo;
  }

  @Property({ persist: false })
  get bedrag() {
    if (!this.prijs) {
      throw new Error("geen prijs");
    }
    return +this.prijs.prijs;
  }

  @Property({ persist: false })
  get isPaid() {
    return this.betaald || (this.payment && this.payment.isPaid);
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
    tickets.forEach((t) => {
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
   * bereken totaal saldo over een set tickets
   * dit kan dus positief of negatief zijn
   * @param {*} tickets
   */
  static totaalSaldo(tickets: Pick<Ticket, "saldo">[]): number {
    return tickets.reduce((totaal, t) => totaal + t.saldo, 0);
  }

  /**
   * bereken totaalbedrag over een set tickets
   * @param {*} tickets
   */
  static totaalBedrag(tickets: Ticket[]): number {
    return tickets.reduce((totaal, t) => totaal + t.bedrag, 0);
  }

  async finishLoading() {
    try {
      await this.payment?.finishLoading();
    } catch (e) {
      throw e;
    }
  }
}
