const { Ticket } = require("./");

module.exports = class {
  constructor(reservering, prijs, transaction) {
    this.reservering = reservering;
    this.prijs = prijs;
    this.transaction = transaction;
    this.tickets = reservering.tickets
      ? reservering.tickets.filter(t => t.prijsId == prijs.id)
      : [];
  }

  get aantal() {
    return this.validTickets ? this.validTickets.length : 0;
  }

  async setAantal(aantal) {
    const oldAantal = this.aantal;
    const transaction = this.transaction;

    if (oldAantal < aantal) {
      let diff = aantal - oldAantal;
      this.reservering.logMessage(`wijziging ${diff} x ${this.prijs}`, {
        transaction
      });
      while (diff--) {
        const ticket = await Ticket.create(
          {
            reserveringId: this.reservering.id,
            reservering: this.reservering,
            prijsId: this.prijs.id,
            prijs: this.prijs
          },
          {
            transaction,
            include: [
              { association: Ticket.Reservering },
              { association: Ticket.Prijs }
            ]
          }
        );
        this.tickets.push(ticket);
      }
    } else if (oldAantal > aantal) {
      let diff = oldAantal - aantal;
      let tickets = this.validTickets;
      for (let i = 0; i < diff; i++) {
        let ticket = tickets[i];
        if (!ticket.payment) {
          await this.reservering.logMessage(`verwijder ${ticket}`, {
            transaction
          });
          await ticket.delete({ transaction });
        } else if (ticket.isPaid()) {
          this.reservering.logMessage(`zet te koop ${ticket}`, { transaction });
          ticket.tekoop = true;
          await ticket.save({ transaction });
        }
      }
    }
  }

  get validTickets() {
    this.tickets
      ? this.tickets.filter(t => !(t.geannuleerd || t.verkocht))
      : [];
  }

  get aantalBetaald() {
    return this.validTickets.filter(t => t.betaald).length;
  }

  get onbetaald() {
    return this.tickets.filter(t => !t.betaald);
  }

  get aantalTekoop() {
    return this.tickets.filter(t => t.tekoop).length;
  }

  getBedrag(aantal = null) {
    if (!aantal) aantal = this.aantal;
    return aantal * this.prijs.prijs;
  }

  /**
   * het verschil tussen totaal bedrag en betaald bedrag
   * < 0 nog te betalen
   * > 0 terugbetalen
   */
  get saldo() {
    return (
      (this.aantalBetaald + this.aantalTekoop - this.aantal) * this.prijs.prijs
    );
  }

  /**
   * het bedrag dat nodig is voor een payment
   */
  get paymentBedrag() {
    return this.tickets.filter(t => !t.paymentId).length * this.prijs.prijs;
  }

  /**
   * het bedrag dat teveel is betaald
   */
  get tegoed() {
    return this.aantalTeKoop * this.prijs.prijs;
  }

  toString() {
    const aantal = this.aantal;
    const totaal = aantal * this.prijs.prijs;
    const aantalTekoop = this.aantalTekoop;
    let retval = `${this.aantal}x ${this.prijs}: €${totaal}`;
    if (aantalTekoop) {
      retval += ` waarvan ${aantalTekoop} te koop`;
    }
    return retval;
  }
};
