import { TicketAggregator, TicketDTO } from "./TicketAggregator";
import { Log } from "../models/Log";
import { Ticket } from "../models/Ticket";
import { Reservering } from "../models";
import { EntityManager } from "@mikro-orm/core";
import { Container } from "typedi";
import { Queue } from "bullmq";

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

export class TicketHandler {
  private oldTickets: TicketAggregator;
  private cancelled: Ticket[] = [];
  private new: Pick<Ticket, "prijs" | "betaald">[] = [];
  private terugKopen: Ticket[] = [];
  private teruggeefbaar: boolean;

  constructor(private em: EntityManager, public reservering: Reservering) {
    this.oldTickets = new TicketAggregator(reservering);
    this.teruggeefbaar = reservering.teruggeefbaar;
  }

  update(newTickets: TicketDTO[]): void {
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
      if (oldTickets.tickets.length < aantal) {
        // bijbestelling
        let oldAantal = aantal - oldTickets.aantalTekoop;

        // als er kaarten bij moeten, maar er zijn er nog in de verkoop
        // haal deze dan uit de verkoop
        if (aantal >= oldAantal && oldTickets.aantalTekoop) {
          let diff = aantal - oldAantal;
          this.terugKopen = this.terugKopen.concat(
            this.oldTickets.tekoop.splice(0, diff)
          );
        }

        for (let i = aantal - oldTickets.tickets.length; i; i--) {
          this.new.push({ prijs, betaald: prijs.prijs == 0 });
          // als er vrijkaarten zijn uitgegeven, dan worden de geannuleerde kaarten meteen teruggegeven
          if (prijs.prijs === 0) {
            this.teruggeefbaar = true;
          }
        }
      } else if (oldTickets.tickets.length > aantal) {
        const diff = oldTickets.tickets.length - aantal;
        this.cancelled = this.cancelled.concat(
          oldTickets.tickets.splice(0, diff)
        );
      }
    }

    this.annuleren();
    this.bestellen();

    const queue: Queue = Container.get("uitvoeringUpdatedQueue");
    queue.add("uitvoeringUpdated", this.reservering.uitvoering.id, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });
  }

  haalUitVerkoop() {
    if (this.terugKopen.length) {
      //
      const description = Ticket.description(this.terugKopen, " en ");
      Log.addMessage(this.reservering, `${description} uit de verkoop gehaald`);
      for (const ticket of this.terugKopen) {
        ticket.tekoop = false;
      }
    }
  }

  annuleren() {
    if (this.cancelled.length) {
      const deletable = this.cancelled.filter(
        (t) => !t.payment || t.payment.status !== "paid"
      );
      const paid = this.cancelled.filter(
        (t) => t.payment && t.payment.status == "paid"
      );

      // just delete
      if (deletable.length) {
        Log.addMessage(
          this.reservering,
          `${Ticket.description(deletable, " en ")} annuleren`
        );
        deletable.map((ticket) => {
          this.reservering.tickets.remove(ticket);
        });
      }

      if (paid.length) {
        if (this.teruggeefbaar) {
          Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, " en ")} terugbetalen`
          );
          paid.map((ticket) => {
            ticket.terugbetalen = true;
          });
        } else {
          Log.addMessage(
            this.reservering,
            `${Ticket.description(paid, " en ")} te koop zetten`
          );
          paid.map((ticket) => {
            ticket.tekoop = true;
          });
        }
      }
    }
  }

  bestellen() {
    if (!this.new.length) return;
    const tickets = [];
    for (const { prijs, betaald } of this.new) {
      const ticket = new Ticket(prijs, betaald);
      this.em.persist(ticket);
      this.reservering.tickets.add(ticket);
      tickets.push(ticket);
    }
    const description = Ticket.description(tickets, " en ");
    Log.addMessage(this.reservering, `${description} besteld`);
  }
}
