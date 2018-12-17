module.exports = class {
  constructor(reservering, prijs, tickets = []) {
    this.reservering = reservering;
    this.prijs = prijs;
    this.tickets = tickets;

    this.Ticket = reservering.sequelize.models.Ticket;
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

  async setAantal(aantal) {
    try {
      let oldAantal = this.aantal - this.aantalTekoop;

      const strPrijs = this.prijs.asString();

      // als er kaarten bij moeten, maar er zijn er nog in de verkoop
      // haal deze dan uit de verkoop
      if (aantal >= oldAantal && this.aantalTekoop) {
        let diff = aantal - oldAantal;
        let tickets = this.tekoop;
        await this.reservering.logMessage(
          `${diff} x ${strPrijs} uit de verkoop gehaald`
        );

        for (let i = 0; i < diff && i < tickets.length; i++) {
          let ticket = tickets[i];
          ticket.tekoop = false;
          oldAantal++;
          await ticket.save();
        }
      }

      if (oldAantal < aantal) {
        let diff = aantal - oldAantal;
        await this.reservering.logMessage(
          `${diff} x ${strPrijs} ${oldAantal ? "bij" : ""}besteld`
        );

        // kijk of er tickets te koop zijn. Deze worden bij deze verkocht
        await this.Ticket.verwerkTekoop(diff);

        while (diff--) {
          const ticket = await this.Ticket.create({
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
        await this.reservering.logMessage(`${diff} x ${strPrijs} geannuleerd`);
        for (let i = 0; i < diff; i++) {
          let ticket = tickets[i];
          const ticketDescription = await ticket.asString();
          if (!ticket.PaymentId) {
            await ticket.destroy();
            this.tickets = this.tickets.filter(t => t.id !== ticket.id);
          } else {
            let payment = ticket.Payment || (ticket.Payment = await ticket.getPayment());
            if (payment.betaalstatus == "paid") {
              const teruggeefbaar = await this.reservering.teruggeefbaar();
              if (teruggeefbaar) {
                await this.reservering.logMessage(`${ticketDescription} terugbetalen`);
                ticket.terugbetalen = true;
              } else {
                await this.reservering.logMessage(`zet te koop ${ticketDescription}`);
                ticket.tekoop = true;
              }
              await ticket.save();
            } else {
              await ticket.destroy();
              this.tickets = this.tickets.filter(t => t.id !== ticket.id);
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
      this.tickets.filter(t => !(t.geannuleerd || t.verkocht)) : [];
  }

  get aantalBetaald() {
    return this.validTickets.filter(t => t.betaald).length;
  }

  get onbetaald() {
    return this.tickets.filter(t => !t.betaald);
  }

  get tekoop() {
    return this.validTickets.filter(t => t.tekoop);
  }

  get terugbetalen() {
    return this.validTickets.filter(t => t.terugbetalen);
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
    return this.tickets.filter(t => !t.paymentId).length * this.prijs.prijs;
  }

  /**
   * het bedrag dat teveel is betaald
   */
  get tegoed() {
    return this.aantalTeKoop * this.prijs.prijs;
  }

  asString() {
    const aantal = this.aantal;
    const totaal = aantal * this.prijs.prijs;
    const aantalTekoop = this.aantalTekoop;
    const aantalTerugbetalen = this.aantalTerugbetalen;
    let retval = `${this.aantal}x ${this.prijs.asString()}: €${totaal}`;
    if (aantalTekoop) {
      retval += ` waarvan ${aantalTekoop} te koop`;
    }
    if (aantalTerugbetalen) {
      retval += ` ${aantalTekoop ? 'en' : 'waarvan'} ${aantalTerugbetalen} wacht op terugbetaling`;
    }
    return retval;
  }
};