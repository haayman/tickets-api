# PlusLeo Reserveringen API

Een NestJS applicatie voor het beheren van theatervoorstellingen en reserveringen.

## Vereisten

- Node.js (>= 18.14.2)
- MySQL (>= 8.0)
- Redis (>= 6.0)

## Installatie

1. Clone de repository:
```bash
git clone [repository-url]
cd plusleo-reserveren-server
```

2. Installeer dependencies:
```bash
npm install
```

3. Kopieer het voorbeeld configuratiebestand:
```bash
cp .env.example .env
```

4. Pas de configuratie aan in `.env`

5. Start de database en Redis:
```bash
# Start MySQL en Redis volgens jouw systeem instructies
```

6. Maak de database aan:
```bash
mysql -u root -p
CREATE DATABASE plusleo;
```

7. Voer de database migraties uit:
```bash
npm run migration:up
```

## Development

Start de applicatie in development mode:
```bash
npm run start:dev
```

## Tests

Run de tests:
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentatie

De API documentatie is beschikbaar via Swagger op `/api` wanneer de applicatie draait.

## Database Migraties

- Maak een nieuwe migratie: `npm run migration:create`
- Voer migraties uit: `npm run migration:up`
- Rollback migratie: `npm run migration:down`
- Update schema: `npm run schema:update`
- Reset database: `npm run schema:fresh`

## Project Structuur

```
src/
  ├── main.ts                 # Application entry point
  ├── app.module.ts           # Root module
  ├── config/                 # Configuration modules
  ├── modules/                # Feature modules
  │   ├── auth/              # Authentication module
  │   ├── users/             # Users module
  │   ├── reservations/      # Reservations module
  │   └── voorstellingen/    # Voorstellingen module
  ├── shared/                # Shared resources
  └── database/              # Database related files
      ├── entities/
      └── migrations/
```

# Tickets API

Deze repo is de backend die hoort bij https://github.com/haayman/tickets-frontend

Het ticket systeem is in eerste instantie geschreven voor de theatergroep PlusLeo https://plusleo.nl die elk jaar een voorstelling heeft met meerdere uitvoeringen


## eigenschappen
- Een voorstelling kan bestaan uit meerdere uitvoeringen
- Er zijn verschillende prijzen mogelijk (bv. volwassene en kind)
- Het is mogelijk om in te stellen dat bepaalde prijzen (vrijkaartje) alleen zijn te bestellen door geautoriseerde gebruikers
- Gebruikers kunnen hun kaarten elk moment aanpassen:
  - aantal gekochte kaarten: bijkopen of annuleren
  - andere uitvoering
 
## annuleren
Om het kopen van kaarten laagdrempelig te houden kunnen kaarten gratis geannuleerd worden tot een bepaalde periode voor de voorstelling, bijvoorbeeld 2 weken. 
De kosten van het terugbetalen zijn voor de rekening van de vereniging
Na 2 weken voor de voorstelling (instelbaar) worden de geannuleerde kaarten ter verkoop aangeboden. Dit houdt in dat de kaarten nog steeds zijn gereserveerd, 
maar zodra er nieuwe kaarten zijn verkocht wordt het bedrag teruggestort en is de annulering definitief. 
Dus na 2 weken voor de voorstelling is de vereniging zeker van de inkomsten.

## wachtrij
Als een uitvoering is uitverkocht komt men in een wachtrij. Zodra er voldoende plaatsen vrijkomen, krijgt de bezoeker een mail om te betalen. 
Ook hier wordt het belang van de vereniging gediend: als iemand met 4 kaarten in de wachtrij staat en er komen 2 plaatsen vrij, dan gaan mensen die 2 kaarten hebben besteld voor. 
Het doel is om de zaal zo vol mogelijk te krijgen.

## requirements
Deze code is afhankelijk van een mysql database en redis voor queue management. Er zijn nog geen scripts of docker bestanden om dit automatisch op te zetten.
Er zijn wel scripts in de database/ directory om de striggers in de database te laden.

