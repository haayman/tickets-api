import {
  FindOptions,
  Populate,
  QueryOrder,
  QueryOrderKeys,
} from "@mikro-orm/core";

export interface Params<T> {
  include?: string[];
  order?: string | string[];
  limit?: number;
  page?: number;
}

function intersect<T>(o1: string[], o2: string[]) {
  return o1.filter((k) => o2.includes(k));
}
/**
 * @param {{include:[table,...],order:['column']}} params
 */
export function parseQuery<T>(
  allowed: string[],
  params: Params<T>
): FindOptions<T> {
  let findOptions: FindOptions<T> = { populate: allowed };

  if (params.include) {
    if (!Array.isArray(params.include)) {
      params.include = [params.include];
    }

    findOptions.populate = intersect(params.include, allowed);
  }

  if (params.order) {
    const orderBy: QueryOrderKeys = {};

    if (!Array.isArray(params.order)) {
      params.order = [params.order];
    }
    for (const order of params.order) {
      const matches = order.match(/^-(.+$)/);
      if (matches) {
        orderBy[matches[1]] = QueryOrder.DESC;
      } else {
        orderBy[order] = QueryOrder.ASC;
      }
    }
    findOptions.orderBy = orderBy;
  }

  if (params.limit) {
    findOptions.limit = +params.limit;
    findOptions.offset = (+params.page || 0) * findOptions.limit;
  }
  return findOptions;
}
