import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  OnInit,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Ticket } from "./Ticket";
import { Reservering } from "./Reservering";
import { MollieClient, MOLLIECLIENT } from "../helpers/MollieClient";
import { Payment as MolliePayment } from "@mollie/api-client";
import { Container } from "typedi";
import winston from "winston";

@Entity({ tableName: "payments" })
export class Payment {
  constructor(payment: MolliePayment, description: string) {
    this.payment = payment;
    this.payment_id = payment.id;
    this.description = description;
  }

  private payment: MolliePayment;

  @PrimaryKey()
  public id!: number;

  @Property()
  payment_id!: string;

  @Property()
  betaalstatus: string;

  @Property()
  description: string;

  @Property()
  paidBack: number;

  @ManyToOne()
  reservering: Reservering;

  @OneToMany(() => Ticket, (ticket) => ticket.payment)
  tickets = new Collection<Ticket>(this);

  // --------- virtual attributes -----------
  @Property({ persist: false })
  get paymentUrl() {
    const paymentUrl = this.payment?.getPaymentUrl();
    return paymentUrl;
  }

  @Property({ persist: false })
  get amount() {
    return +this.payment?.amount?.value;
  }

  @Property({ persist: false })
  get amountRefunded() {
    return this.payment && this.payment.amountRefunded
      ? +this.payment.amountRefunded.value
      : undefined;
  }

  get amountRemaining() {
    return this.payment && this.payment.amountRemaining
      ? +this.payment.amountRemaining?.value
      : undefined;
  }

  @Property({ persist: false })
  get paidAt() {
    return this.payment?.paidAt ? new Date(this.payment.paidAt) : undefined;
  }

  @Property({ persist: false })
  get status() {
    const betaalstatus = this.payment?.status;
    if (betaalstatus && betaalstatus !== this.betaalstatus) {
      this.betaalstatus = betaalstatus;
    }
    return this.betaalstatus;
  }

  @Property({ persist: false })
  get refundable() {
    return this.payment?.isRefundable();
  }

  @Property({ persist: false })
  get isPaid(): boolean {
    return (
      this.betaalstatus === "paid" ||
      (this.payment?.isPaid ? this.payment.isPaid() : undefined)
    );
  }

  toJSON(strict = true, strip = [], ...args: any[]) {
    const o = wrap(this, true).toObject(...args);
    delete o.payment;
    return o;
  }

  finishLoading() {
    return this.initPayment();
  }

  async initPayment() {
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

  async refund(amount: number) {
    try {
      const mollieClient = Container.get(MOLLIECLIENT) as MollieClient;
      const refund = await mollieClient.mollie.payments_refunds.create({
        paymentId: this.payment_id,
        amount: {
          currency: "EUR",
          value: amount.toFixed(2),
        },
      });
      return refund;
    } catch (e) {
      winston.error(e);
      throw e;
    }
  }
}
