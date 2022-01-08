import { paymentResponse, refundResponse } from "./mollie_response";
import mollieMock from "./mollie-mock";

let lastPaymentId = 0;

export default function mockPayment(status) {
  mollieMock
    .post(/payments/)
    .once()
    .reply(200, (uri, requestBody) => {
      const paymentId = "tr_" + ++lastPaymentId;

      // in eerste instantie op 'open' zetten
      const postResponse = paymentResponse({
        paymentId: paymentId,
        status: "open",
      });

      // .times(99) zodat heel vaak het request 'gemocked' wordt
      mollieMock
        .get("/v2/payments/" + paymentId)
        .times(99)
        .reply(
          200,
          paymentResponse({
            paymentId,
            status: status,
          })
        );
      mollieMock.post("/v2/payments/" + paymentId + "/refunds").reply(
        200,
        refundResponse({
          paymentId: paymentId,
        })
      );

      return postResponse(uri, requestBody);
    });
}
