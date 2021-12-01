import { EntityManager, RequestContext } from "@mikro-orm/core";

export function getRepository<type>(type: string) {
  const em: EntityManager = RequestContext.getEntityManager();
  return em.getRepository<type>(type);
}
