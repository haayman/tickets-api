import config from "config";
import globalData from "./globalData";

export function getRoot() {
  return config.get("server.url");
}

export function getBetalingUrl(id: string) {
  return getRoot() + `/reserveren/${id}/betalen`;
}

export function getResendUrl(id: string) {
  return getRoot() + `/reserveren/${id}/resend`;
}

export function getEditLink(id: string) {
  return getRoot() + `/reserveren/${id}`;
}

export function getTicketUrl(id: string) {
  return getRoot() + `/reserveren/${id}/details`;
}

export function getQrUrl(id: string) {
  return getRoot() + `/api/reservering/${id}/qr`;
}

export function getMailUrl(id: string, template: string) {
  return getRoot() + `/api/reservering/${id}/mail?template=${template}`;
}

export function redirectUrl(id: string) {
  return getRoot() + "/api/payment/done/" + id;
}

export function webhookUrl(id: string) {
  return getWebhookRoot() + "/api/payment/bank/" + id;
}

export function getWebhookRoot() {
  // const root = globalData.get("localtunnel")
  //   ? globalData.get("localtunnel")
  return config.get("server.bank");
  // return root;
}
