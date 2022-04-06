import { TicketAggregator, TicketDTO } from "./TicketAggregator";
import { Log } from "../models/Log";
import { Ticket } from "../models/Ticket";
import { Reservering } from "../models";
import { EntityManager } from "@mikro-orm/core";

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

type NewTicket = Pick<Ticket, "prijs" | "betaald" | "saldo">;

export class TicketHandler {
  private oldTickets: TicketAggregator;
  private teruggeefbaar: boolean;

  constructor(private em: EntityManager, public reservering: Reservering) {
    this.oldTickets = new TicketAggregator(reservering);
    this.teruggeefbaar = reservering.teruggeefbaar;
  }

  update(newTickets: TicketDTO[]): void {
    let cancelled: Ticket[] = [];
    const nieuw: NewTicket[] = [];
    let terugKopen: Ticket[] = [];

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

    for (let { prijs, aantal } of newTickets) {
      const oldTickets = this.oldTickets.aggregates[prijs.id];
      // vervang prijs door het échte prijs record
      prijs = oldTickets.prijs;

      let oldAantal = oldTickets.aantal - oldTickets.aantalTekoop;
      if (oldAantal < aantal) {
        // bijbestelling

        // als er kaarten bij moeten, maar er zijn er nog in de verkoop
        // haal deze dan uit de verkoop
        if (aantal >= oldAantal && oldTickets.aantalTekoop) {
          let diff = aantal - oldAantal;
          terugKopen = terugKopen.concat(oldTickets.tekoop.splice(0, diff));
        }

        for (let i = aantal - oldTickets.tickets.length; i; i--) {
          nieuw.push({
            prijs,
            betaald: prijs.prijs == 0,
            saldo: -prijs.prijs,
          });
          // als er vrijkaarten zijn uitgegeven, dan worden de geannuleerde kaarten meteen teruggegeven
          if (prijs.prijs === 0) {
            this.teruggeefbaar = true;
          }
        }
      } else if (oldTickets.tickets.length > aantal) {
        const diff = oldTickets.tickets.length - aantal;
        cancelled = cancelled.concat(oldTickets.tickets.splice(0, diff));
      }
    }

    if (nieuw.length) this.haalUitVerkoop(terugKopen);
    this.annuleren(cancelled, nieuw);
    this.bestellen(nieuw);
  }

  haalUitVerkoop(terugKopen: Ticket[]) {
    if (terugKopen.length) {
      //
      const description = Ticket.description(terugKopen, " en ");
      Log.addMessage(this.reservering, `${description} uit de verkoop gehaald`);
      for (const ticket of terugKopen) {
        ticket.tekoop = false;
      }
    }
  }

  verwerkVerschil(paid: Ticket[], nieuw: NewTicket[], deletable: Ticket[]) {
    // zet eerst het terug te betalen bedrag op de volle prijs
    let terugTeBetalen = 0;
    paid.forEach((ticket) => {
      ticket.saldo = ticket.prijs.prijs;
      terugTeBetalen += ticket.prijs.prijs;
    });

    let teBetalen = Ticket.totaalSaldo(nieuw);

    /*
      nieuw: [], paid: [10] => paid: [10: terugbetalen: 10]
      nieuw: [10], paid: [7,7] => nieuw: [10:betaald], paid: [7: deleted, 7: terugbetalen: 3]
      nieuw: [7,7]: paid: [10] => nieuw: [7:betaald,7], paid: [10: terugbetalen: 2]
    */

    while (terugTeBetalen >= teBetalen) {
      const teBetalenTicket = nieuw.find((t) => t.saldo < 0);
      const terugTeBetalenTicket = paid.find((t) => t.saldo > 0);
      if (!terugTeBetalenTicket || !teBetalenTicket) break;

      const bedrag = Math.min(
        -teBetalenTicket.saldo,
        terugTeBetalenTicket.saldo
      );
      teBetalenTicket.saldo += bedrag;
      terugTeBetalenTicket.saldo -= bedrag;
      if (teBetalenTicket.saldo == 0) {
        teBetalenTicket.betaald = true;
      }
      if (terugTeBetalenTicket.saldo == 0) {
        deletable.push(terugTeBetalenTicket);
      }
      terugTeBetalen -= bedrag;
      teBetalen -= bedrag;
    }
  }

  annuleren(cancelled: Ticket[], nieuw: NewTicket[]) {
    if (cancelled.length) {
      const deletable = cancelled.filter((t) => !t.isPaid || !t.bedrag);
      const paid = cancelled.filter((t) => t.isPaid);

      if (paid.length) {
        if (this.teruggeefbaar) {
          this.verwerkVerschil(paid, nieuw, deletable);
          Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, " en ")} terugbetalen`
          );
        } else {
          Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, " en ")} te koop zetten`
          );
          paid.forEach((ticket) => {
            ticket.tekoop = true;
          });
        }
      }

      if (deletable.length) {
        Log.addMessage(
          this.reservering,
          `${Ticket.description(deletable, " en ")} annuleren`
        );
        deletable.forEach((ticket) => {
          this.reservering.tickets.remove(ticket);
        });
      }
    }
  }

  bestellen(nieuw: NewTicket[] = []) {
    if (!nieuw.length) return;
    const tickets = [];
    for (const { prijs, betaald, saldo } of nieuw) {
      const ticket = new Ticket(prijs, betaald, saldo);
      this.em.persist(ticket);
      this.reservering.tickets.add(ticket);
      tickets.push(ticket);
    }
    const description = Ticket.description(tickets, " en ");
    Log.addMessage(this.reservering, `${description} besteld`);
  }
}
