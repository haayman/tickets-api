const { createMollieClient } = require("@mollie/api-client");
import config from "config";

const mollie_key = config.get("payment.mollie_key");

const mollie = createMollieClient({ apiKey: mollie_key });
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
import { Payment as MolliePayment } from "@mollie/api-client";

@Entity({ tableName: "payments" })
export class Payment {
  constructor(payment: MolliePayment, description: string) {
    this.payment = payment;
    this.payment_id = payment.id;
    this.description = description;
  }

  private payment: MolliePayment;

  static mollieClient() {
    return mollie;
  }

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
      ? +this.payment.amountRefunded.value + this.paidBack
      : undefined;
  }
  // amountRemaining() {
  //   return this.payment && this.payment.amountRemaining ? +this.payment.amountRemaining.value : undefined;
  // },

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
      (this.payment ? this.payment.isPaid() : undefined)
    );
  }

  toJSON(strict = true, strip = [], ...args: any[]) {
    const o = wrap(this, true).toObject(...args);
    delete o.payment;
    return o;
  }

  async finishLoading() {
    await this.initPayment();
  }

  async initPayment() {
    if (!this.payment) {
      if (this.payment_id) {
        const payment = await mollie.payments.get(this.payment_id);
        this.payment = payment;
      }
    }
  }

  async refund(amount: number) {
    const refund = await mollie.payments_refunds.create({
      paymentId: this.payment_id,
      amount: {
        currency: "EUR",
        value: amount.toFixed(2),
      },
    });
    return refund;
  }
}
