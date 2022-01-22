import { createMollieClient, Payment, Refund } from "@mollie/api-client";
import { CreateParameters as RefundParameters } from "@mollie/api-client/dist/types/src/resources/payments/refunds/parameters";
import { CreateParameters as PaymentParameters } from "@mollie/api-client/dist/types/src/resources/payments/parameters";
import config from "config";
import { Token } from "typedi";

const apiKey: string = config.get("payment.mollie_key");

export const MOLLIECLIENT = new Token("MOLLIECLIENT");

export interface IMollieClient {
  payments: {
    create(params: PaymentParameters): Promise<Payment>;
    get(id: string): Promise<Payment>;
  };
  payments_refunds: {
    create(params: RefundParameters): Promise<Refund>;
  };
}

export class MollieClient {
  private client: IMollieClient;
  constructor() {
    this.client = createMollieClient({ apiKey });
  }
  get mollie() {
    return this.client;
  }
}
