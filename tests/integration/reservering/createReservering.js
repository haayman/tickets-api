/**
 * create Reservering. Mock the payments
 */

const mockPayment = require('./mockPayment');

async function createReservering(request, reservering) {
  mockPayment('paid')

  const reserveringResult = await request.post("/api/reservering")
    .send(reservering);

  expect(reserveringResult.status).toBe(200);
  expect(reserveringResult.body.id).toBeDefined();

  const id = reserveringResult.body.id;
  const payments = reserveringResult.body.payments;
  let paymentResult = null;
  if (payments.length) {
    paymentResult = await request.post("/api/payment/bank/" + id).send({
      id: payments[0].paymentId
    })
    expect(paymentResult.status).toBe(200);
  }

  return {
    reservering: reserveringResult,
    payment: paymentResult || null
  }
}

async function updateReservering(request, reservering) {
  mockPayment('paid')

  const reserveringResult = await request.put("/api/reservering/" + reservering.id)
    .send(reservering);

  expect(reserveringResult.status).toBe(200);
  expect(reserveringResult.body.id).toBeDefined();

  const notPaid = reserveringResult.body.Payments.find(p => p.status !== 'paid');
  if (notPaid) {
    const id = reserveringResult.body.id;
    const paymentId = notPaid.paymentId;
    const paymentResult = await request.post("/api/payment/bank/" + id).send({
      id: paymentId
    })
    expect(paymentResult.status).toBe(200);
  }

  return reserveringResult
}

module.exports = {
  createReservering,
  updateReservering
}