const TicketAggregator = require('./TicketAggregator');
const Log = require('../models/Log');
const Ticket = require('../models/Ticket');

/**
 * @typedef {Object} Prijs
 * @property {Number} id
 * @property {Number} prijs
 */

/**
 * @typedef {Object} newTicket
 * @property {Prijs} prijs
 * @property {Number} aantal
 */

module.exports = class TicketHandler {
  constructor(reservering) {
    this.reservering = reservering;
    this.trx = reservering.$knex();
    this.oldTickets = new TicketAggregator(reservering);
    this.cancelled = [];
    this.new = [];
    this.terugKopen = [];
    this.tekoop = [];
  }

  /**
   *
   * @param {newTicket[]} newTickets
   */
  async update(newTickets) {
    // aangeroepen met een lege array: maak er lege aggregates van
    if (!newTickets.length) {
      // empty array
      newTickets = Object.values(this.oldTickets.aggregates).reduce(
        (tickets, agg) => {
          tickets.push({ prijs: agg.prijs, aantal: 0 });
          return tickets;
        },
        []
      );
    }

    newTickets.forEach(({ prijs, aantal }) => {
      const oldTickets = this.oldTickets.aggregates[prijs.id];
      if (oldTickets.tickets.length < aantal) {
        // bijbestelling
        let oldAantal = aantal - oldTickets.aantalTekoop;

        // als er kaarten bij moeten, maar er zijn er nog in de verkoop
        // haal deze dan uit de verkoop
        if (aantal >= oldAantal && oldTickets.aantalTekoop) {
          let diff = aantal - oldAantal;
          this.terugKopen = this.terugKopen.concat(
            this.oldTickets.tekoop(splice(0, diff))
          );
        }

        for (let i = aantal - oldTickets.tickets.length; i; i--) {
          this.new.push({ prijs: prijs, betaald: prijs.prijs == 0 });
        }
      } else if (oldTickets.tickets.length > aantal) {
        const diff = oldTickets.tickets.length - aantal;
        this.cancelled = this.cancelled.concat(
          oldTickets.tickets.splice(0, diff)
        );
      }
    });

    await this.haalUitVerkoop();
    await this.annuleren();

    // kijk of er tickets doorverkocht kunnen worden
    await Ticket.verwerkTekoop(this.trx, this.new.length);

    await this.bestellen();
  }

  async haalUitVerkoop() {
    if (this.terugKopen.length) {
      //
      const description = Ticket.description(this.terugKopen, ' en ');
      await Log.addMessage(
        this.reservering,
        `${description} uit de verkoop gehaald`
      );
      await Promise.all(
        this.terugKopen.map(async (ticket) => {
          ticket.tekoop = false;
          await ticket.$query(this.trx).patch({
            tekoop: false
          });
        })
      );
    }
  }

  async annuleren() {
    if (this.cancelled.length) {
      const description = Ticket.description(this.cancelled, ' en ');
      await Log.addMessage(this.reservering, `${description} geannuleerd`);

      const deletable = this.cancelled.filter(
        (t) => !t.paymentId || t.payment.status !== 'paid'
      );
      const paid = this.cancelled.filter(
        (t) => t.payment && t.payment.status == 'paid'
      );

      // just delete
      if (deletable.length) {
        await Log.addMessage(
          this.reservering,
          `${Ticket.description(deletable, ' en ')} annuleren`
        );
        await Promise.all(
          deletable.map(async (ticket) => {
            await Ticket.query(this.trx).deleteById(ticket.id);
          })
        );
      }

      if (paid.length) {
        if (this.reservering.teruggeefbaar) {
          await Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, ' en ')} terugbetalen`
          );
          await Promise.all(
            paid.map(async (ticket) => {
              await ticket.$query(this.trx).patch({
                terugbetalen: true
              });
              ticket.terugbetalen = true;
            })
          );
        } else {
          await Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, ' en ')} te koop zetten`
          );
          await Promise.all(
            paid.map(async (ticket) => {
              await ticket.$query(this.trx).patch({
                tekoop: true
              });
              ticket.tekoop = true;
            })
          );
        }
      }
    }
  }

  async bestellen() {
    await Promise.all(
      this.new.map(async ({ prijs, betaald }) => {
        const ticket = await Ticket.query(this.trx).insertAndFetch({
          reserveringId: this.reservering.id,
          prijsId: prijs.id,
          betaald: betaald
        });

        ticket.reservering = this.reservering;
        if (!this.reservering.tickets) {
          this.reservering.tickets = [];
        }
        this.reservering.tickets.push(ticket);
      })
    );
  }
};
