import { Entity, PrimaryKey, Property, ManyToOne, OnInit, Filter } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Reservering } from './reservering.entity';
import { Payment } from './payment.entity';
import { Prijs } from './prijs.entity';

@Filter({
  name: 'valid',
  cond: { verkocht: false, geannuleerd: false },
  default: true,
})
@Entity({ tableName: 'tickets' })
export class Ticket {
  constructor(prijs: Prijs, betaald: boolean, saldo: number) {
    this.prijs = prijs;
    this.betaald = betaald;
    this.saldo = saldo;
    this.tekoop = false;
    this.geannuleerd = false;
    this.verkocht = false;
    this.created_at = new Date();
    this.updated_at = new Date();
  }

  @PrimaryKey()
  @ApiProperty()
  id: number;

  @ManyToOne(() => Reservering)
  reservering: Reservering;

  @ManyToOne(() => Payment)
  payment: Payment;

  @ManyToOne(() => Prijs)
  prijs: Prijs;

  @Property()
  @ApiProperty()
  tekoop: boolean = false;

  @Property()
  @ApiProperty()
  geannuleerd: boolean = false;

  @Property()
  @ApiProperty()
  verkocht: boolean = false;

  @Property()
  @ApiProperty()
  betaald: boolean = false;

  @Property()
  @ApiProperty()
  saldo: number = 0;

  @Property()
  @ApiProperty()
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updated_at: Date = new Date();

  @Property({ persist: false })
  @ApiProperty()
  get openstaandBedrag(): number {
    return -this.saldo;
  }

  @Property({ persist: false })
  @ApiProperty()
  get isValid(): boolean {
    return !this.verkocht && !this.geannuleerd && !this.terugBetalen;
  }

  @Property({ persist: false })
  @ApiProperty()
    /**
   * het ticket wordt bijna terugbetaald, maar dat is nog niet gebeur
   */
  get terugBetalen(): boolean {
    return this.saldo > 0;
  }

  @OnInit()
  toNumeric(): void {
    // terugbetalen is als 'decimal' opgeslagen, wat mikro-orm niet herkent
    this.saldo = +this.saldo;
  }

  @Property({ persist: false })
  @ApiProperty()
  get bedrag(): number {
    if (!this.prijs) {
      throw new Error('geen prijs');
    }
    return +this.prijs.prijs;
  }

  @Property({ persist: false })
  @ApiProperty()
  get isPaid(): boolean {
    return this.betaald || (this.payment && this.payment.isPaid);
  }

  toString(): string {
    return `1x ${this.prijs}`;
  }

  /**
   * Maak een beschrijving van een groep tickets
   * @param tickets De tickets om te beschrijven
   * @param separator De separator tussen de regels
   */
  static description(tickets: Pick<Ticket, 'prijs'>[], separator = '\n'): string {
    // Tel aantal tickets per prijs
    const counter: {
      [key: number]: {
        count: number;
        prijs: Prijs;
        bedrag: number;
      };
    } = {};

    tickets.forEach(t => {
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
      .map(c => {
        const totaal = (c.count * c.prijs.prijs).toFixed(2);
        const count = c.count;
        return `${count}x ${c.prijs}: €${totaal}`;
      })
      .join(separator);
  }

  /**
   * Bereken totaal saldo over een set tickets
   * Dit kan dus positief of negatief zijn
   * @param tickets De tickets om het saldo van te berekenen
   */
  static totaalSaldo(tickets: Pick<Ticket, 'saldo'>[]): number {
    return tickets.reduce((totaal, t) => totaal + t.saldo, 0);
  }

  /**
   * Bereken totaalbedrag over een set tickets
   * @param tickets De tickets om het bedrag van te berekenen
   */
  static totaalBedrag(tickets: Ticket[]): number {
    return tickets.reduce((totaal, t) => totaal + t.bedrag, 0);
  }

  async finishLoading(): Promise<void> {
    try {
      await this.payment?.finishLoading();
    } catch (e) {
      throw e;
    }
  }
} 
