/**
 * 
 * @param {QueryBuilder} query 
 * @param {{include:[table,...],order:['column']}} params 
 */
function parseQuery(query, params) {
  if (params.include) {
    const eager = JSON.stringify(params.include).replace(/\"/g, '');

    query.eager(eager);
  }

  if (params.order) {
    if (!Array.isArray(params.order)) {
      params.order = [params.order];
    }
    params.order.forEach(p => {
      const matches = p.match(/^-(.+$)/);
      if (matches) {
        query.orderBy(matches[1], 'desc')
      } else {
        query.orderBy(p);
      }
    })
  }
  return query
}

module.exports = parseQuery;
