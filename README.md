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

