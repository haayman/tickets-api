const { Reservering, Ticket, Log } = require('.');
const ReserveringMail = require('../components/ReserveringMail');
const config = require('config');

module.exports = class RefundHandler {
  constructor(reservering) {
    try {
      this.reservering = reservering;
      this.tickets = this.terugtebetalenTickets();
      this.payments = this.terugtebetalenPayments();
    } catch (ex) {
      console.log('RefundHandler.constructor', ex);
      throw ex;
    }
  }

  terugtebetalenTickets() {
    return this.reservering.tickets.filter((t) => t.terugbetalen);
  }

  /**
   * @return [{paymentId: zamount}]
   */
  terugtebetalenPayments() {
    const terugbetalen = this.tickets;
    let payments = {};
    terugbetalen.map((t) => {
      if (t.paymentId) {
        if (!payments[t.paymentId]) {
          const payment = this.reservering.payments.find(
            (p) => (p.id = t.paymentId)
          );

          if (!payment.tickets) {
            payment.tickets = this.reservering.tickets.filter(
              (t) => t.paymentId == payment.id
            );
          }

          payments[t.paymentId] = {
            payment: payment,
            amount: 0
          };
        }
        payments[t.paymentId].amount += t.prijs.prijs;
      }
    });
    return payments;
  }

  async refund() {
    //* @var [{paymentId: amount}]
    const payments = this.payments;

    let nonRefundable = [];
    await Promise.all(
      Object.keys(payments).map(async (paymentId) => {
        const amount = payments[paymentId].amount;
        let payment = payments[paymentId].payment;

        // t.b.v. tests: gebruik 'norefund' in het e-mail adres
        if (payment.refundable && !this.reservering.email.match('norefund')) {
          let refunded;
          try {
            refunded = await payment.refund(amount);
          } catch (ex) {
            // al gerefund. We hadden hier niet mogen komen
            console.error(ex);
            throw new Error(`Payment ${payment} al teruggestort`);
          }
          if (refunded) {
            const terugbetalen = payment.tickets.filter((t) => t.terugbetalen);
            await Promise.all(
              terugbetalen.map(async (ticket) => {
                ticket.terugbetalen = false;
                ticket.geannuleerd = true;
                await ticket.$query().patch({
                  terugbetalen: ticket.terugbetalen,
                  geannuleerd: ticket.geannuleerd
                });
              })
            );
            const paymentDescription = Ticket.description(terugbetalen);
            await ReserveringMail.send(
              this.reservering,
              'teruggestort',
              `${paymentDescription} teruggestort`,
              {
                bedrag: amount
              }
            );
            await Log.addMessage(
              this.reservering,
              `${paymentDescription} teruggestort`
            );

            // als er geen tickets meer over zijn, reservering verwijderen
            // this.reservering.tickets = await this.reservering.$relatedQuery('tickets');
            // if (this.reservering.validTickets.length === 0) {
            //   ReserveringMail.send(reservering, 'verwijderd', 'Alle kaarten zijn verkocht')
            //   // await this.reservering.$query().delete();
            // }
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
      if (!this.reservering.iban && !this.reservering.tennamevan) {
        await ReserveringMail.send(
          this.reservering,
          'ibanRequested',
          'Bankgegevens nodig'
        );
      } else {
        await ReserveringMail.send(
          this.reservering,
          'terugbetalen_penningmeester',
          'Verzoek tot terugstorting',
          {
            to: config.get('penningmeester')
          }
        );
      }
    }
  }

  nonRefundablePayments() {
    //* @var [{paymentId: amount}]
    const payments = this.payments;
    let retval = [];
    Object.keys(payments).map((p) => {
      const payment = p.payment;
      if (
        payment.refundable === false ||
        this.reservering.email.match('norefund')
      ) {
        retval.push(payment);
      }
    });
    return retval;
  }

  nonRefundableAmount() {
    const payments = this.nonRefundablePayments();
    let retval = 0;
    payments.map(async (payment) => {
      let tickets = payment.tickets;
      tickets = tickets.filter((t) => t.terugbetalen);
      retval += tickets.reduce(
        (totaal, ticket) => totaal + ticket.prijs.prijs,
        0
      );
    });

    return retval;
  }

  getPaymentById(paymentId) {
    const payment = this.reservering.payments.find((p) => p.id == paymentId);
    return payment;
  }

  static async verwerkRefunds(Reservering, Ticket) {
    const reserveringen = await Reservering.query()
      .withGraphFetched(Reservering.getStandardGraph())
      .whereIn(
        'id',
        Ticket.query()
          .select('reserveringId')
          .where('terugbetalen', true)
      );

    await Promise.all(
      reserveringen.map(async (r) => {
        await new RefundHandler(r).refund();
      })
    );
  }
};
