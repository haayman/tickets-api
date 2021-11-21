import {
  Entity,
  Index,
  ManyToOne,
  OneToMany,
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

  constructor({ prijs, description, role }: PrijsDTO) {
    this.description = description;
    this.prijs = prijs;
    this.role = role;
  }
}
