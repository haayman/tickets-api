import { EntityManager } from "@mikro-orm/core";
import { Container } from "typedi";

export function getRepository<type>(type: string) {
  console.log(__filename);
  const em: EntityManager = Container.get("em");
  return em.getRepository<type>(type);
}
