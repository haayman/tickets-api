import nock from "nock";
import axios from "axios";
import adapter from "axios/lib/adapters/http";
import { endpoint } from "./MockMollieClient";

axios.defaults.adapter = adapter;

// axios.interceptors.request.use((request) => {
//   console.log("Starting Request", JSON.stringify(request, null, 2));
//   return request;
// });

// axios.interceptors.response.use((response) => {
//   console.log("Starting response", JSON.stringify(response, null, 2));
//   return response;
// });

export const mollieNock = nock(endpoint);
