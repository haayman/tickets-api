/**
 * Op de frontend wordt alleen over tickets gecommuniceerd als aantal per prijs
 * bijvoorbeeld: 3x volwassene, 2x vrijkaartje
 * intern worden losse tickets gehanteerd
 * Deze class verzamelt alle losse tickets en maakt er aggregates van
 */
import winston from "winston";
import { Prijs, Reservering, Ticket } from "../models";

export type TicketDTO = {
  prijs: Prijs;
  aantal: number;
};

export class TicketAggregator {
  public aggregates: { [key: number]: Aggregate };
  constructor(public reservering: Reservering) {
    this.aggregates = {};

    if (reservering.uitvoering?.voorstelling?.prijzen) {
      for (const prijs of reservering.uitvoering.voorstelling.prijzen) {
        this.aggregates[prijs.id] = new Aggregate(
          prijs,
          reservering.tickets.getItems()
        );
      }
    } else {
      winston.error("geen prijzen bekend");
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
    return this.reservering.tickets.getItems().filter((t) => t.tekoop);
  }
}

export class Aggregate {
  constructor(public prijs: Prijs, public tickets: Ticket[] = []) {
    this.prijs = prijs;
    this.tickets = tickets.filter((t) => t.prijs.id == prijs.id);
  }

  toJSON() {
    return {
      prijs: this.prijs,
      // tickets: this.tickets,
      aantal: this.aantal,
      aantalBetaald: this.aantalBetaald,
      aantalTekoop: this.aantalTekoop,
      aantalTerugbetalen: this.aantalTerugbetalen,
      bedrag: this.bedrag,
    };
  }

  get validTickets() {
    return this.tickets.filter((t) => !(t.geannuleerd || t.verkocht));
  }

  get aantalBetaald() {
    return this.validTickets.filter((t) => t.isPaid).length;
  }

  get tekoop() {
    return this.validTickets.filter((t) => t.tekoop);
  }

  get terugbetalen() {
    return this.validTickets.filter((t) => t.saldo > 0);
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
    return Ticket.totaalBedrag(this.validTickets);
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
        aantalTekoop ? "en" : "waarvan"
      } ${aantalTerugbetalen} wacht op terugbetaling`;
    }
    return retval;
  }
}
