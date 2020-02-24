module.exports = class TicketAggregator {
  /**
   *
   * @param {Reservering} reservering
   */
  constructor(reservering) {
    this.aggregates = {};
    this.reservering = reservering;

    if (reservering.uitvoering) {
      reservering.uitvoering.voorstelling.prijzen.forEach((prijs) => {
        this.aggregates[prijs.id] = new Aggregate(prijs, reservering.tickets);
      });
    }
  }

  toJSON() {
    return Object.values(this.aggregates)
      .sort((a, b) => b.prijs.prijs - a.prijs.prijs) // descending prijs
      .map((a) => a.toJSON());
  }

  /**
   * alle tickets die te koop staan
   */
  get tekoop() {
    return this.reservering.tekoop;
  }
};

class Aggregate {
  constructor(prijs, tickets = []) {
    this.prijs = prijs;
    this.tickets = tickets.filter((t) => t.prijsId == prijs.id);
  }

  toJSON() {
    return {
      prijs: this.prijs,
      tickets: this.tickets,
      aantal: this.aantal,
      aantalBetaald: this.aantalBetaald,
      aantalTekoop: this.aantalTekoop,
      aantalTerugbetalen: this.aantalTerugbetalen,
      bedrag: this.bedrag
    };
  }

  get validTickets() {
    return this.tickets.filter((t) => !(t.geannuleerd || t.verkocht));
  }

  get aantalBetaald() {
    return this.validTickets.filter((t) => t.betaald).length;
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

  get aantal() {
    return this.validTickets.length;
  }

  get bedrag() {
    return this.validTickets.length * this.prijs.prijs;
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
}
