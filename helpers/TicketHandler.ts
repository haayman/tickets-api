/**
 * TicketHandler
 * Behandelt de mutaties
 * @example {2x volwassene, 1 kind} => {3x volwassene}
 * @example {} => {2x vrijkaart}
 */
import { TicketAggregator, TicketDTO } from "./TicketAggregator";
import { Log } from "../models/Log";
import { Ticket } from "../models/Ticket";
import { Reservering, User } from "../models";
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

  update(newTickets: TicketDTO[], role?: string): void {
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
      if (aantal && prijs.role) {
        if (!User.hasRole(role, prijs.role)) {
          throw new Error(
            `Onvoldoende rechten op ${prijs.description} te bestellen`
          );
        }
      }

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

    if (terugKopen.length) this.haalUitVerkoop(terugKopen);
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
    paid.forEach((ticket) => {
      ticket.saldo = ticket.prijs.prijs;
    });

    /*
      nieuw: [], paid: [+10] => paid: [+10]
      nieuw: [-10], paid: [+7,+7] => nieuw: [0], paid: [7: deleted, 7: +3]
      nieuw: [-7,-7]: paid: [10] => nieuw: [0,4], paid: [0]
      nieuw: [-12]: paid: [7] => nieuw:[-5], paid: [0]
    */

    let terugTeBetalenTickets = paid.filter((t) => t.saldo > 0);
    let teBetalenTickets = nieuw.filter((t) => t.saldo < 0);
    while (terugTeBetalenTickets.length && teBetalenTickets.length) {
      const teBetalenTicket = teBetalenTickets[0];
      const terugTeBetalenTicket = terugTeBetalenTickets[0];
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
      terugTeBetalenTickets = paid.filter((t) => t.saldo > 0);
      teBetalenTickets = nieuw.filter((t) => t.saldo < 0);
    }
  }

  annuleren(cancelled: Ticket[], nieuw: NewTicket[]) {
    if (cancelled.length) {
      const deletable = cancelled.filter((t) => !t.isPaid || !t.bedrag);
      const paid = cancelled.filter((t) => t.isPaid);

      if (paid.length) {
        this.verwerkVerschil(paid, nieuw, deletable);
        if (this.teruggeefbaar) {
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
            // zet saldo terug op 0 om te voorkomen dat ze meteen terugbetaald krijgen
            ticket.saldo = 0;
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
