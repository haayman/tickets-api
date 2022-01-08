import nock from "nock";
import axios from "axios";
import winston from "winston";

axios.interceptors.request.use((request) => {
  winston.log("axios request", request);
  return request;
});

axios.interceptors.request.use((response) => {
  winston.log("axios response", response);
  return response;
});

const mollieNock = nock("https://api.mollie.com:443/");

export default mollieNock;
