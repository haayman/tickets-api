import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, wrap } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import { Uitvoering } from './uitvoering.entity';
import { Ticket } from './ticket.entity';
import { Log } from './log.entity';
import { StatusUpdate } from './status-update.entity';
import { Payment } from './payment.entity';
import { Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity({ tableName: 'reserveringen' })
export class Reservering {
  @PrimaryKey()
  @ApiProperty()
  id: string = v4();

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Uitvoering)
  uitvoering: Uitvoering;

  @OneToMany(() => Ticket, ticket => ticket.reservering)
  tickets = new Collection<Ticket>(this);

  @OneToMany(() => Log, log => log.reservering)
  logs = new Collection<Log>(this);

  @OneToMany(() => StatusUpdate, statusUpdate => statusUpdate.reservering)
  statusUpdates = new Collection<StatusUpdate>(this);

  @OneToMany(() => Payment, payment => payment.reservering)
  payments = new Collection<Payment>(this);

  @Property()
  @ApiProperty()
  naam: string;

  @Property()
  @ApiProperty()
  email: string;

  @Property()
  @ApiProperty({ required: false })
  opmerking?: string;

  @Property()
  @ApiProperty({ required: false })
  opmerking_gebruiker?: string;

  @Property()
  @ApiProperty()
  wachtlijst: boolean = false;

  @Property()
  @ApiProperty({ required: false })
  ingenomen?: Date;

  @Property()
  @ApiProperty({ required: false })
  status?: string;

  @Property()
  @ApiProperty()
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updated_at: Date = new Date();

  toString(): string {
    return `${this.aantal}x ${this.uitvoering}`;
  }

  toJSON(strict = true, strip = [], ...args: any[]): any {
    const o = wrap(this, true).toObject(...args);
    if (this.tickets.isInitialized()) {
      // Implementatie via service
      o.tickets = this.tickets.getItems();
    }
    return o;
  }

  async finishLoading(): Promise<void> {
    const promises = [
      ...this.payments.getItems().map(p => p.finishLoading()),
      ...this.tickets.getItems().map(t => t.finishLoading?.()),
    ];
    try {
      await Promise.all(promises);
    } catch (e) {
      throw e;
    }
  }

  @Property({ persist: false })
  @ApiProperty()
  get ticketAggregates(): any[] {
    // Implementatie via service
    return this.tickets.getItems();
  }

  @Property({ persist: false })
  @ApiProperty()
  get validTickets(): Ticket[] | undefined {
    if (!this.tickets.isInitialized()) return undefined;
    return this.tickets.getItems().filter(t => !t.geannuleerd);
  }

  @Property({ persist: false })
  @ApiProperty()
  get onbetaaldeTickets(): Ticket[] | undefined {
    return this.validTickets?.filter(t => !t.verkocht && t.saldo > 0);
  }

  @Property({ persist: false })
  @ApiProperty()
  get newPaymentNeeded(): boolean {
    return (
      !this.wachtlijst &&
      (this.onbetaaldeTickets?.length ?? 0) > 0 &&
      this.payments.getItems().filter(p => p.betaalstatus === 'open').length === 0
    );
  }

  @Property({ persist: false })
  @ApiProperty()
  get saldo(): number | undefined {
    return this.validTickets
      ? this.validTickets.reduce((sum, t) => sum + t.saldo, 0)
      : undefined;
  }

  @Property({ persist: false })
  @ApiProperty()
  get openstaandBedrag(): number | undefined {
    return this.saldo !== undefined ? -this.saldo : undefined;
  }

  @Property({ persist: false })
  @ApiProperty()
  get bedrag(): number | undefined {
    if (!this.tickets.isInitialized()) {
      Logger.debug('bedrag undefined');
      return undefined;
    }
    return this.validTickets?.reduce((sum, t) => sum + t.saldo, 0);
  }

  @Property({ persist: false })
  @ApiProperty()
  get aantal(): number | undefined {
    if (!this.tickets.isInitialized()) {
      Logger.debug('aantal undefined');
      return undefined;
    }
    return this.validTickets?.length;
  }

  async moetInWachtrij(em: EntityManager, existing: boolean): Promise<boolean> {
    try {
      if (existing) {
        // tel het aantal vrije plaatsen als je deze reservering niet meetelt
        const vrije_plaatsen = await this.uitvoering.countVrijePlaatsen(em, this.id);
        return vrije_plaatsen < (this.aantal ?? 0);
      } else {
        const vrije_plaatsen = this.uitvoering.vrije_plaatsen;
        return vrije_plaatsen < (this.aantal ?? 0);
      }
    } catch (e) {
      throw e;
    }
  }

  setStatus(status: string): void {
    this.status = status;
    this.statusUpdates.add(new StatusUpdate());
  }

  @Property({ persist: false })
  @ApiProperty()
  get teruggeefbaar(): boolean | undefined {
    if (!this.uitvoering) {
      return undefined;
    }
    const today = new Date();
    const days = 14; // Configureerbaar via service
    const diff = Math.floor((this.uitvoering.datum.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > days;
  }

  @Property({ persist: false })
  @ApiProperty()
  get paymentUrl(): string | undefined {
    if (!this.payments.isInitialized()) {
      return undefined;
    }
    const payment = this.payments.getItems().find(p => p.paymentUrl);
    Logger.debug(`paymentUrl: ${payment?.paymentUrl}`);
    return payment?.paymentUrl;
  }

  getMailUrl(template: string): string {
    return `/mail/${this.id}/${template}`;
  }

  getBetalingUrl(): string {
    return `/betaling/${this.id}`;
  }

  getEditLink(): string {
    return `/edit/${this.id}`;
  }

  getQrUrl(): string {
    return `/qr/${this.id}`;
  }

  getResendUrl(): string {
    return `/resend/${this.id}`;
  }

  getTicketUrl(): string {
    return `/ticket/${this.id}`;
  }

  static populate(): string[] {
    return [
      'uitvoering.voorstelling.prijzen',
      'tickets.payment',
      'tickets.prijs',
      'payments',
      'logs',
      'statusUpdates',
    ];
  }
} 
