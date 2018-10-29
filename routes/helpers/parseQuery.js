function getIncludes(model, params, includes = []) {
  params.forEach(param => {
    const levels = param.split(".");
    const association = model[levels[0]];
    if (association) {
      let newInclude = {
        association: association
      };
      if (levels.length > 1) {
        newInclude.include = getIncludes(association.target, [levels.slice(1).join('.')]);
      }
      includes.push(newInclude);
    } else {
      throw new Error(`${model.tableName} has no association ${levels[0]}`);
    }
  });
  return includes;
}

function parseQuery(model, query) {
  let params = query;
  if (query.include) {
    params.include = getIncludes(model, query.include);
  }
  if (params.order) {
    let order = []
    if (!Array.isArray(params.order)) {
      params.order = [params.order];
    }
    params.order.forEach(p => {
      const matches = p.match(/^-(.+$)/);
      if (matches) {
        order.push([matches[1], 'desc'])
      } else {
        order.push([p, 'asc']);
      }
    })
    params.order = order;
  }
  return params;
}

module.exports = parseQuery;