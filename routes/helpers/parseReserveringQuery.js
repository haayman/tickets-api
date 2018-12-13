const _parseQuery = require('./parseQuery');

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) === index;
}


module.exports = function (model, params) {
  if (params.include && params.include.includes('tickets')) {

    params.include = params.include.filter((i) => i !== 'tickets').concat([
      'Uitvoering.Voorstelling.Prijzen',
      'Tickets.Payment,Prijs',
      'Payments'
    ]).filter(onlyUnique);
    model.addHook('afterFind', model.initTickets);
  }
  return _parseQuery(model, params);
}