const nock = require('nock');
const axios = require('axios');
const winston = require('winston');

axios.interceptors.request.use(request => {
  winston.log('axios request', request);
  return request;
})

axios.interceptors.request.use(response => {
  winston.log('axios response', response);
  return response;
})

const mollieNock = nock('https://api.mollie.com:443/')

module.exports = mollieNock;