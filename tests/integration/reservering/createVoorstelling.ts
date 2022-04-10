import { Voorstelling, getRepository } from "../../../models";

import addDays from "date-fns/addDays";
import { EntityManager } from "@mikro-orm/core";

export const REFUNDABLE = 0;
export const NON_REFUNDABLE = 1;

export const VOLWASSENE = 0;
export const KIND = 1;
export const VRIJKAART = 2;

export async function createVoorstelling(em: EntityManager) {
  const repository = em.getRepository<Voorstelling>("Voorstelling");
  const voorstelling = repository.create({
    title: "title1",
    description: "Description 1",
    active: true,
    url: "https://plusleo.nl/",
    locatie: "locatie 1",
    opmerkingen: "opmerkingen1",
    prijzen: [
      {
        description: "volwassenen",
        prijs: 10,
      },
      {
        description: "kinderen",
        prijs: 5,
      },
      {
        description: "vrijkaartje",
        prijs: 0,
      },
    ],
    uitvoeringen: [
      {
        // over 2 maanden: refundable
        aanvang: addDays(new Date(), 60),
        deur_open: new Date(),
        aantal_plaatsen: 2,
      },
      {
        // over 10 dagen: niet refundable
        aanvang: addDays(new Date(), 10),
        deur_open: new Date(),
        aantal_plaatsen: 2,
      },
    ],
  });
  await repository.persistAndFlush(voorstelling);

  return voorstelling;
}
