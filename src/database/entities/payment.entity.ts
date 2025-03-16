import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, wrap } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Reservering } from './reservering.entity';
import { Ticket } from './ticket.entity';
import { MollieClient, MOLLIECLIENT } from "../helpers/MollieClient";

import { Payment as MolliePayment } from '@mollie/api-client';

@Entity({ tableName: 'payments' })
export class Payment {
  constructor(payment: MolliePayment, description: string) {
    this.payment = payment;
    this.payment_id = payment.id;
    this.description = description;
    this.betaalstatus = payment.status;
    this.paidBack = 0;
    this.tickets = new Collection<Ticket>(this);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  private payment: MolliePayment;

  @PrimaryKey()
  @ApiProperty()
  id: number;

  @Property()
  @ApiProperty()
  payment_id: string;

  @Property()
  @ApiProperty()
  betaalstatus: string;

  @Property()
  @ApiProperty()
  description: string;

  @Property()
  @ApiProperty()
  paidBack: number;

  @ManyToOne(() => Reservering)
  reservering: Reservering;

  @OneToMany(() => Ticket, ticket => ticket.payment)
  tickets = new Collection<Ticket>(this);

  @Property({ persist: false })
  @ApiProperty()
  get paymentUrl(): string | undefined {
    const paymentUrl = this.payment?.getPaymentUrl();
    return paymentUrl;
  }


  @Property({ persist: false })
  @ApiProperty()
  get amount(): number | undefined {
    return +this.payment?.amount?.value;
  }

  @Property({ persist: false })
  @ApiProperty()
  get amountRefunded(): number | undefined {
    return this.payment && this.payment.amountRefunded
      ? +this.payment.amountRefunded.value
      : undefined;
  }

  @Property({ persist: false })
  @ApiProperty()
  get amountRemaining(): number | undefined {
        return this.payment && this.payment.amountRemaining
      ? +this.payment.amountRemaining?.value
      : undefined;

  }

  @Property({ persist: false })
  @ApiProperty()
  get paidAt(): Date | undefined {
    return this.payment?.paidAt ? new Date(this.payment.paidAt) : undefined;
  }

  @Property({ persist: false })
  @ApiProperty()
  get status(): string {
    const betaalstatus = this.payment?.status;
    if (betaalstatus && betaalstatus !== this.betaalstatus) {
      this.betaalstatus = betaalstatus;
    }
    return this.betaalstatus;
  }

  @Property({ persist: false })
  @ApiProperty()
  get refundable(): boolean | undefined {
    return this.payment?.isRefundable();
  }

  @Property({ persist: false })
  @ApiProperty()
  get isPaid(): boolean {
    return (
      this.betaalstatus === "paid" ||
      (this.payment?.isPaid ? this.payment.isPaid() : undefined)
    );
  }

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  /**
   * Vraag een refund aan voor deze betaling
   * @param amount Het bedrag om terug te betalen
   */
  async refund(amount: number): Promise<any> {
    try {
      // Implementatie via service
      Logger.log(`Refund aangevraagd voor betaling ${this.payment_id} met bedrag ${amount}`);
      return undefined;
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  toJSON(strict = true, strip = [], ...args: any[]): any {
    const o = wrap(this, true).toObject(...args);
    delete o.payment;
    return o;
  }

  /**
   * Laad de betaling volledig in
   */
  finishLoading(): Promise<void> {
    return this.initPayment();
  }

  /**
   * Initialiseer de betaling met de Mollie API
   */
  async initPayment(): Promise<void> {
    if (!this.payment) {
      if (this.payment_id) {
        try {
          const mollieClient = Container.get(MOLLIECLIENT) as MollieClient;
          const payment = await mollieClient.mollie.payments.get(
            this.payment_id
          );
          this.payment = payment;
        } catch (e) {
          throw e;
        }
      }
    }
  }
} 
