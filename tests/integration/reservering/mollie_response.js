let payments = {};

function paymentResponse(options = {
  status: 'open',
  paymentId
}) {
  let {
    status,
    paymentId
  } = options

  return (uri, requestBody) => {

    if (requestBody) {
      // post. Store
      payments[paymentId] = requestBody;
    } else {
      const matches = uri.match(/.+\/(.+?)$/);
      paymentId = matches[1];
      requestBody = payments[paymentId];
    }
    let response = Object.assign({}, {
      "mocked": true,
      "resource": "payment",
      "id": paymentId,
      "mode": "test",
      "createdAt": "2018-11-22T20:20:12+00:00",
      "paidAt": status === "paid" ? new Date().toISOString() : null,
      // "amount": requestBody.amount,
      // "description": "2x volwassenen: €20.00",
      "method": "ideal",
      // "metadata": {
      //   "reservering_id": reserveringId,
      //   "payment_id": null
      // },
      amountRemaining: requestBody.amount,
      "status": status,
      "isCancelable": false,
      "expiresAt": "2018-11-22T20:35:12+00:00",
      "profileId": "pfl_S3BMD2hEpQ",
      "sequenceType": "oneoff",
      "redirectUrl": "https://dev.plusleo.nl/api/payment/done/2fce39f7-f5f5-480f-b031-d3c7f61c9c13",
      "webhookUrl": "https://dev.plusleo.nl/api/payment/bank/2fce39f7-f5f5-480f-b031-d3c7f61c9c13",
      "_links": {
        "self": {
          "href": "https://api.mollie.com/v2/payments/tr_AEb4jp2uJy",
          "type": "application/hal+json"
        },
        "documentation": {
          "href": "https://docs.mollie.com/reference/v2/payments-api/get-payment",
          "type": "text/html"
        }
      }
    }, requestBody);

    if (status !== 'paid') {
      response._links.checkout = {
        "href": "https://www.mollie.com/paymentscreen/issuer/select/ideal/AEb4jp2uJy",
        "type": "text/html"
      }
    }

    return response;
  }
}

function refundResponse(options = {
  status: 'refunded',
  paymentId: null,
  refundId
}) {
  let {
    status,
    paymentId,
    refundId
  } = options
  if (!refundId) {
    refundId = 're_' + require('./makeid')();
  }
  return (uri, requestBody) => {

    let response = Object.assign({}, {
      "mocked": true,
      "resource": "refund",
      "id": refundId,
      "paymentId": paymentId,
      "mode": "test",
      "status": "refunded",
      "_links": {
        "self": {
          "href": "https://api.mollie.com/v2/payments/" + refundId,
          "type": "application/hal+json"
        },
      }
    }, requestBody);

    return response;
  }
}


module.exports = {
  paymentResponse,
  refundResponse
}