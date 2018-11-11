module.exports = {
  async terugtebetalenTickets() {
    if (!this.Tickets) this.Tickets = await this.getTickets();
    return this.Tickets.filter(t => t.terugbetalen);
  },

  /**
   * @return [{paymentId: amount}]
   */
  async terugtebetalenPayments() {
    const terugbetalen = await this.terugtebetalenTickets();
    let payments = {};
    await Promise.all(
      terugbetalen.map(async t => {
        if (t.PaymentId) {
          if (!payments[t.PaymentId]) {
            payments[t.PaymentId] = 0;
          }
          t.prijs = await t.getPrijs();
          payments[t.PaymentId] += t.prijs.prijs;
        }
      })
    );
    return payments;
  },

  async refund() {
    //* @var [{paymentId: amount}]
    const payments = await this.terugtebetalenPayments();

    let nonRefundable = [];
    await Promise.all(
      Object.keys(payments).map(async paymentId => {
        const amount = payments[paymentId];
        let payment = await Payment.findById(paymentId, {
          include: [Payment.Tickets]
        });
        if (payment.isRefundable()) {
          const refunded = await payment.refund(amount);
          if (refunded) {
            await Promise.all(
              terugbetalen.map(async ticket => {
                ticket.terugbetalen = false;
                ticket.geannuleerd = true;
                await ticket.save();
              })
            );
            const Ticket = Reservering.sequelize.models.Ticket;
            const paymentDescription = await Ticket.description(terugbetalen);
            await this.logMessage(`${paymentDescription} teruggestort`);
          }
        } else {
          nonRefundable.push({
            payment,
            amount
          });
        }
      })
    );

    if (nonRefundable.length) {
      if (!this.iban && !this.tennamevan) {
        ReserveringMail.send(this, "ibanRequested", "Bankgegevens nodig");
      } else {
        ReserveringMail.send(
          this,
          "terugbetalen_penningmeester",
          "Verzoek tot terugstorting", {
            to: config.get("penningmeester"),
          }
        );
      }
    }
  },

  async nonRefundablePayments() {
    //* @var [{paymentId: amount}]
    const payments = await this.terugtebetalenPayments();
    let retval = [];
    await Promise.all(Object.keys(payments).map(async paymentId => {
      const payment = await this.getPaymentById(+paymentId);
      if (!payment.isRefundable()) {
        retval.push(payment)
      }
    }));
    return retval
  },

  async nonRefundableAmount() {
    const payments = await this.nonRefundablePayments();
    return payments.reduce((totaal, payment) => {
      return totaal + payment.amount
    }, 0);
  },

  async getPaymentById(paymentId) {
    const payment = this.payments.find(p => p.id == paymentId);
    if (!payment) {
      payment = await Payment.findById(paymentId, {
        include: [{
          association: [Payment.Tickets]
        }]
      });
    }
    return payment;
  }

}