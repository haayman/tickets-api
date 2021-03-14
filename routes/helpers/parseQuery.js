/**
 *
 * @param {QueryBuilder} query
 * @param {{include:[table,...],order:['column']}} params
 */
function parseQuery(query, params) {
  if (params.include) {
    const withGraphFetched = JSON.stringify(params.include).replace(/\"/g, "");

    query.withGraphJoined(withGraphFetched);
  }

  if (params.order) {
    if (!Array.isArray(params.order)) {
      params.order = [params.order];
    }
    params.order.forEach((p) => {
      const matches = p.match(/^-(.+$)/);
      if (matches) {
        query.orderBy(matches[1], "desc");
      } else {
        query.orderBy(p);
      }
    });
  }
  if (params.limit) {
    query.page(+params.page || 0, +params.limit);
  }
  return query;
}

module.exports = parseQuery;
