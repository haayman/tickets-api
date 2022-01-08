import { EntityManager } from "@mikro-orm/core";

export default async function (em: EntityManager) {
  const connection = em.getConnection();
  await connection.close();
}
