import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Uitvoering } from "./Uitvoering";
import { Prijs } from "./Prijs";

@Entity()
export class Voorstelling {
  @PrimaryKey()
  public id!: number;

  @Property()
  title!: string;

  @Property()
  description!: string;

  @Property()
  active: boolean;

  @Property()
  url: string;

  @Property()
  locatie: string;

  @Property()
  opmerkingen: string;

  @Property()
  poster: string;

  @Property()
  thumbnail: string;

  @OneToMany(() => Prijs, (prijs) => prijs.voorstelling)
  prijzen = new Collection<Prijs>(this);

  @OneToMany(() => Uitvoering, (uitvoering) => uitvoering.voorstelling)
  uitvoeringen = new Collection<Uitvoering>(this);
}
