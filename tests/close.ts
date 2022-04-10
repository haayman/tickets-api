import { EntityManager } from "@mikro-orm/core";

export default function (em: EntityManager) {
  const connection = em.getConnection();
  return connection.close();
}
