import Container from "typedi";
import { MollieClient, MOLLIECLIENT } from "../helpers/MollieClient";

export default function () {
  Container.set(MOLLIECLIENT, new MollieClient());
}
