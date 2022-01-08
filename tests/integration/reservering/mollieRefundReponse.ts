let payments = {};

export default function createMollieResponse(
  options: { status?: string; paymentId?: string; setPaymentUrl?: boolean } = {
    status: "open",
    paymentId: null,
    setPaymentUrl: true,
  }
) {
  let { status, paymentId, setPaymentUrl } = options;
  // if (!paymentId) {
  //   paymentId = 'tr_' + require('./makeid')();
  // }
  return (uri, requestBody) => {
    let reserveringId;
    if (requestBody) {
      // post. Store
      payments[paymentId] = requestBody;
    } else {
      // get original data
      requestBody = payments[paymentId];
    }
    reserveringId = requestBody.metadata.reservering_id;
    let response = Object.assign(
      {},
      {
        mocked: true,
        resource: "payment",
        id: paymentId,
        mode: "test",
        createdAt: "2018-11-22T20:20:12+00:00",
        // "amount": requestBody.amount,
        // "description": "2x volwassenen: €20.00",
        method: "ideal",
        // "metadata": {
        //   "reservering_id": reserveringId,
        //   "payment_id": null
        // },
        status: status,
        isCancelable: false,
        expiresAt: "2018-11-22T20:35:12+00:00",
        profileId: "pfl_S3BMD2hEpQ",
        sequenceType: "oneoff",
        redirectUrl:
          "https://dev.plusleo.nl/api/payment/done/2fce39f7-f5f5-480f-b031-d3c7f61c9c13",
        webhookUrl:
          "https://dev.plusleo.nl/api/payment/bank/2fce39f7-f5f5-480f-b031-d3c7f61c9c13",
        _links: {
          self: {
            href: "https://api.mollie.com/v2/payments/tr_AEb4jp2uJy",
            type: "application/hal+json",
          },
          documentation: {
            href: "https://docs.mollie.com/reference/v2/payments-api/get-payment",
            type: "text/html",
          },
        },
      },
      requestBody
    );

    if (setPaymentUrl) {
      response._links.checkout = {
        href: "https://www.mollie.com/paymentscreen/issuer/select/ideal/AEb4jp2uJy",
        type: "text/html",
      };
    }

    return response;
  };
}
