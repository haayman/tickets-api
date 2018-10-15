const _ = require("lodash");
const Joi = require("joi");
const express = require("express");
const validObjectId = require("../middleware/validateObjectId");
const config = require("config");
const mollie_key = config.get("payment.mollie_key");
const mollie = require("@mollie/api-client")({
  apiKey: mollie_key
});
const { Payment } = require("../models/Payment");
const { Reservering } = require("../models/Reservering");

const router = express.Router();

router.post("/bank/:id", async (req, res) => {
  const mollie_payment = await mollie.payments.get(req.body.id);
  const payment = await Payment.findOne({ paymentId: mollie_payment.id });
  payment.status = mollie_payment.status;
  payment.save();

  const reservering = Reservering.findById(req.params.id);
  reservering.save();
});

module.exports = router;
