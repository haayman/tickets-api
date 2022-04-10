import {
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  OnInit,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Voorstelling } from "./Voorstelling";

export type PrijsDTO = {
  description: string;
  prijs: number;
  role?: string;
};

@Entity({ tableName: "prijzen" })
export class Prijs {
  @PrimaryKey()
  public id!: number;

  @Property()
  description!: string;

  @Property()
  prijs: number = 0;

  @Property()
  role?: string;

  @ManyToOne()
  voorstelling!: Voorstelling;

  toString() {
    return this.description;
  }

  @OnInit()
  toNumeric() {
    // prijs is als 'decimal' opgeslagen, wat mikro-orm niet herkent
    this.prijs = +this.prijs;
  }

  toJSON(strict = true, strip = [], ...args: any[]) {
    const o = wrap(this, true).toObject(...args);
    o.prijs = +this.prijs;
    delete o.voorstelling;
    return o;
  }

  constructor({ prijs, description, role }: PrijsDTO) {
    this.description = description;
    this.prijs = prijs;
    this.role = role;
  }
}
