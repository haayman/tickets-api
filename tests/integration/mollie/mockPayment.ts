import { paymentResponse, refundResponse } from "./mollieResponses";
import { mollieNock } from "./mollie-nock";
import winston from "winston";
import { makeid } from "../reservering/makeid";

let lastPaymentId = 0;

export function mockPayment(status) {
  mollieNock
    .post("/payments")
    .once()
    .reply(200, (uri, requestBody) => {
      const paymentId = `tr_${makeid()}`;
      winston.info(`mocking paymentId ${paymentId}`);

      // in eerste instantie op 'open' zetten
      const postResponse = paymentResponse({
        paymentId: paymentId,
        status: "open",
      });

      // .times(99) zodat heel vaak het request 'gemocked' wordt
      mollieNock
        .get("/v2/payments/" + paymentId)
        .times(99)
        .reply(
          200,
          paymentResponse({
            paymentId,
            status: status,
          })
        );
      mollieNock.post("/v2/payments/" + paymentId + "/refunds").reply(
        200,
        refundResponse({
          paymentId: paymentId,
        })
      );

      return postResponse(uri, requestBody);
    });
}
