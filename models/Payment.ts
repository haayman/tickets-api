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
    this.paymentId = payment.id;
    this.description = description;
  }

  private payment: MolliePayment;

  static mollieClient = mollie;

  @PrimaryKey()
  public id!: number;

  @Property()
  paymentId!: string;

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

  @OnInit()
  async initPayment() {
    if (!this.payment) {
      if (this.paymentId) {
        this.payment = await mollie.payments.get(this.paymentId);
      }
    }
  }

  // --------- virtual attributes -----------
  @Property({ persist: false })
  get paymentUrl() {
    return this.payment?.getPaymentUrl();
  }

  @Property({ persist: false })
  get amount() {
    return this.payment?.amount?.value;
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
    return this.payment?.paidAt;
  }

  @Property({ persist: false })
  get status() {
    return this.payment?.status;
  }

  @Property({ persist: false })
  get refundable() {
    return this.payment?.isRefundable();
  }

  @Property({ persist: false })
  get isPaid() {
    return this.payment ? this.payment.isPaid() : undefined;
  }
}
