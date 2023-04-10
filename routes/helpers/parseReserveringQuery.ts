import { parseQuery as _parseQuery, Params } from "./parseQuery";

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
export function parseQuery<T>(allowed: string[], params: Params<T>) {
  if (!params.include) {
    params.include = ["tickets"];
  }
  if (!Array.isArray(params.include)) {
    params.include = [params.include];
  }
  if (params.include?.includes("tickets")) {
    params.include = params.include
      .filter((i) => i !== "tickets")
      .concat([
        "uitvoering.voorstelling.prijzen",
        "tickets.payment,prijs",
        "tickets.prijs",
        "payments",
      ])
      .filter(onlyUnique);
  }
  return _parseQuery(allowed, params);
}
