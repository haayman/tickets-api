import { Entity, PrimaryKey, Property, Collection, OneToMany, ManyToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Reservering } from './reservering.entity';
import { Voorstelling } from './voorstelling.entity';
import { Ticket } from './ticket.entity';
import { EntityManager } from '@mikro-orm/core';
import { Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export type UitvoeringDTO = {
  aantal_plaatsen: number;
  aanvang: Date;
  deur_open: Date;
  extra_text?: string;
};

@Entity({ tableName: 'uitvoeringen' })
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
  @ApiProperty()
  id: number;

  @ManyToOne(() => Voorstelling)
  voorstelling: Voorstelling;

  @Property()
  @ApiProperty()
  aantal_plaatsen: number;

// ------------------- updated by triggers ----------

  @Property()
  @ApiProperty()
  vrije_plaatsen: number;

 

  @Property()
  @ApiProperty()
  gereserveerd: number = 0;

  @Property()
  @ApiProperty()
  te_koop: number = 0;

  @Property()
  @ApiProperty()
  wachtlijst: number = 0;

  @Property()
  @ApiProperty()
  aanvang: Date = new Date();

  @Property()
  @ApiProperty()
  deur_open: Date = new Date();

  @Property()
  @ApiProperty({ required: false })
  extra_text?: string;

  @OneToMany(() => Reservering, reservering => reservering.uitvoering)
  reserveringen = new Collection<Reservering>(this);

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  @Property({ persist: false })
  @ApiProperty()
  get tickets(): Ticket[] | undefined {
    return this.reserveringen.isInitialized()
      ? this.reserveringen.getItems().reduce((tickets, reservering) => {
          return tickets.concat(reservering.tickets.getItems());
        }, [] as Ticket[])
      : undefined;
  }

  async countGereserveerd(em: EntityManager, reservering_id: string | number): Promise<number> {
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
        AND not verkocht
        `,
        [this.id, reservering_id]
      );

      const count = result[0].count;
      return count;
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  async countVrijePlaatsen(em: EntityManager, reservering_id: string | number): Promise<number> {
    try {
      return Math.max(
        this.aantal_plaatsen - await this.countGereserveerd(em, reservering_id),
        0
      );
    } catch (e) {
      throw e;
    }
  }

  @Property({ persist: false })
  @ApiProperty()
  get status(): string {
    const wachtlijst = this.wachtlijst;
    const vrije_plaatsen = this.vrije_plaatsen;
    const tekoop = this.te_koop;
    const retval: string[] = [];

    if (vrije_plaatsen) {
      retval.push(`<span>${vrije_plaatsen} vrije plaats${vrije_plaatsen === 1 ? '' : 'en'}</span>`);
    } else {
      retval.push('<b>Uitverkocht</b>');
    }

    if (!vrije_plaatsen || wachtlijst) {
      retval.push(` <span>wachtlijst: ${wachtlijst || 0}</span>`);
    }
    if (tekoop) {
      retval.push(` te koop: ${tekoop}`);
    }

    return retval.join(', ');
  }

  countTickets(options: {
    tekoop?: boolean;
    reservering_id?: string;
    wachtlijst?: boolean;
  }): number {
    let tickets = this.tickets;
    if (!tickets) return 0;

    if (options.tekoop !== undefined) {
      tickets = tickets.filter(t => !!t.tekoop === !!options.tekoop);
    }

    if (options.reservering_id) {
      tickets = tickets.filter(t => t.reservering.id !== options.reservering_id);
    }

    if (options.wachtlijst !== undefined) {
      tickets = tickets.filter(t => !!t.reservering.wachtlijst === !!options.wachtlijst);
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
