const Ticket = require('./Ticket');
const Log = require('./Log');

module.exports = class TicketAggregate {
  constructor(reservering, prijs, tickets = []) {
    this.reservering = reservering;
    this.prijs = prijs;
    this.tickets = tickets;
    this.trx = reservering.$transaction();
  }

  get aantal() {
    return this.validTickets ? this.validTickets.length : 0;
  }

  toJSON() {
    return {
      prijs: this.prijs,
      tickets: this.tickets,
      aantal: this.aantal,
      aantalBetaald: this.aantalBetaald,
      aantalTekoop: this.aantalTekoop,
      aantalTerugbetalen: this.aantalTerugbetalen,
      bedrag: this.getBedrag
    };
  }

  async setAantal(Ticket, aantal) {
    try {
      let oldAantal = this.aantal - this.aantalTekoop;
      const trx = this.trx;

      const strPrijs = this.prijs.toString();

      // als er kaarten bij moeten, maar er zijn er nog in de verkoop
      // haal deze dan uit de verkoop
      if (aantal >= oldAantal && this.aantalTekoop) {
        let diff = aantal - oldAantal;
        let tickets = this.tekoop;
        await Log.addMessage(
          this.reservering,
          `${diff} x ${strPrijs} uit de verkoop gehaald`
        );

        for (let i = 0; i < diff && i < tickets.length; i++) {
          let ticket = tickets[i];
          ticket.tekoop = false;
          oldAantal++;
          await ticket.$query(this.trx).patch({
            tekoop: false
          });
        }
      }

      if (oldAantal < aantal) {
        let diff = aantal - oldAantal;
        await Log.addMessage(
          this.reservering,
          `${diff} x ${strPrijs} ${oldAantal ? 'bij' : ''}besteld`
        );

        // kijk of er tickets te koop zijn. Deze worden bij deze verkocht
        await Ticket.verwerkTekoop(this.trx, diff);

        while (diff--) {
          const ticket = await Ticket.query(this.trx).insertAndFetch({
            reserveringId: this.reservering.id,
            prijsId: this.prijs.id,
            betaald: this.prijs.prijs == 0 // vrijkaartjes zijn automatisch betaald
          });

          // nadat ticket is opgeslagen met id's prijs en reservering toevoegen
          ticket.prijs = this.prijs;
          ticket.reservering = this.reservering;

          this.tickets.push(ticket);
        }
      } else if (oldAantal > aantal) {
        let diff = oldAantal - aantal;
        let tickets = this.validTickets;
        await Log.addMessage(
          this.reservering,
          `${diff} x ${strPrijs} geannuleerd`,
          trx
        );
        for (let i = 0; i < diff; i++) {
          let ticket = tickets[i];
          const ticketDescription = ticket.toString();
          if (!ticket.paymentId) {
            // nog niet betaald? Kan veilig verwijderd worden
            await Ticket.query(this.trx).deleteById(ticket.id);
            this.tickets = this.tickets.filter((t) => t.id !== ticket.id);
          } else {
            let payment = ticket.payment;
            if (payment.betaalstatus == 'paid') {
              const teruggeefbaar = this.reservering.teruggeefbaar;
              if (teruggeefbaar) {
                await Log.addMessage(
                  this.reservering,
                  `${ticketDescription} terugbetalen`,
                  trx
                );
                ticket.terugbetalen = true;
              } else {
                await Log.addMessage(
                  this.reservering,
                  `zet te koop ${ticketDescription}`,
                  trx
                );
                ticket.tekoop = true;
              }
              await ticket.$query(this.trx).patch({
                terugbetalen: !!ticket.terugbetalen,
                tekoop: !!ticket.tekoop
              });
            } else {
              // niet betaald: kan weg
              await Ticket.query(this.trx).deleteById(ticket.id);
              this.tickets = this.tickets.filter((t) => t.id !== ticket.id);
            }
          }
        }
      }
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  }

  get validTickets() {
    return this.tickets ?
      this.tickets.filter((t) => !(t.geannuleerd || t.verkocht)) : [];
  }

  get aantalBetaald() {
    return this.validTickets.filter((t) => t.betaald).length;
  }

  get onbetaald() {
    return this.tickets.filter((t) => !t.betaald);
  }

  get tekoop() {
    return this.validTickets.filter((t) => t.tekoop);
  }

  get terugbetalen() {
    return this.validTickets.filter((t) => t.terugbetalen);
  }

  get aantalTerugbetalen() {
    return this.terugbetalen.length;
  }

  get aantalTekoop() {
    return this.tekoop.length;
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
    return this.tickets.filter((t) => !t.paymentId).length * this.prijs.prijs;
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
    const aantalTerugbetalen = this.aantalTerugbetalen;
    let retval = `${this.aantal}x ${this.prijs}: €${totaal.toFixed(2)}`;
    if (aantalTekoop) {
      retval += ` waarvan ${aantalTekoop} te koop`;
    }
    if (aantalTerugbetalen) {
      retval += ` ${
        aantalTekoop ? 'en' : 'waarvan'
      } ${aantalTerugbetalen} wacht op terugbetaling`;
    }
    return retval;
  }

  static factory(reservering, uitvoering, tickets) {
    return uitvoering.voorstelling.prijzen.map((prijs) => {
      return new TicketAggregate(
        reservering,
        prijs,
        tickets.filter((t) => t.prijsId == prijs.id)
      );
    });
  }
};
