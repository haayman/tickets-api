import { IMollieClient } from "../../../helpers/MollieClient";
import axios from "axios";
import winston from "winston";

export const endpoint = "https://api.mollie.com:443";

process.env.DEBUG = "nock.*";

class Payment {
  constructor(data) {
    Object.assign(this, data);
  }
  getPaymentUrl() {
    // @ts-ignore
    return this._links?.checkout?.href;
  }

  isRefundable() {
    return true;
  }

  isPaid() {
    // @ts-ignore
    return this.status === "paid";
  }
}

function createMollieClient() {
  return {
    payments: {
      async create(params) {
        winston.info(`mock create`);
        const { data } = await axios.post(`${endpoint}/payments`, params);
        return new Payment(data);
      },
      async get(paymentId) {
        const { data } = await axios.get(
          `${endpoint}/v2/payments/${paymentId}`
        );
        return new Payment(data);
      },
    },
    payments_refunds: {
      async create({ paymentId, ...params }) {
        const { data } = await axios.post(
          `${endpoint}/v2/payments/${paymentId}/refunds`,
          params
        );
        return data;
      },
    },
  };
}

export class MollieClient {
  private client: IMollieClient;
  constructor() {
    // @ts-ignore
    this.client = createMollieClient();
  }
  get mollie() {
    return this.client;
  }
}
