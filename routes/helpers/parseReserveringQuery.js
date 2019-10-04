const _parseQuery = require('./parseQuery');
const Reservering = require('../../models/Reservering');


module.exports = function (params, reservering = Reservering) {
  let query = reservering.query().allowEager('[uitvoering.voorstelling.prijzen,tickets.[payment,prijs],payments,logs,statusupdates]')
  if (!params.include) {
    params.include = ['tickets'];
  }
  if (params.include && params.include.includes('tickets')) {

    params.include = params.include.filter((i) => i !== 'tickets').concat([
      'uitvoering.voorstelling.prijzen',
      'tickets.[payment,prijs]',
      'payments'
    ])
  }
  return _parseQuery(query, params);
}
