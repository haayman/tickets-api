import {
  Cascade,
  Collection,
  Entity,
  Filter,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { Uitvoering } from "./Uitvoering";
import { Prijs } from "./Prijs";

@Filter({
  name: "active",
  cond: { active: true },
  default: true,
})
@Entity({ tableName: "voorstellingen" })
export class Voorstelling {
  @PrimaryKey()
  public id!: number;

  @Property()
  title!: string;

  @Property()
  description!: string;

  @Property()
  active: boolean = true;

  @Property()
  url?: string;

  @Property()
  locatie?: string;

  @Property()
  opmerkingen?: string;

  @Property()
  poster?: string;

  @Property()
  thumbnail?: string;

  @OneToMany(() => Prijs, (prijs) => prijs.voorstelling, {
    orphanRemoval: true,
  })
  prijzen = new Collection<Prijs>(this);

  @OneToMany(() => Uitvoering, (uitvoering) => uitvoering.voorstelling, {
    orphanRemoval: true,
  })
  uitvoeringen = new Collection<Uitvoering>(this);

  /**
   * mikro-orm assign werkt niet goed met nieuwe/verwijderde prijzen/uitvoeringen
   * @param newData
   */
  updateNestedEntities(collection: Collection<any>, newData: any[]) {
    let oldIds = collection.getItems().map((item) => item.id);
    let newIds = newData.map((item) => item.id);

    let updatedItems = collection
      .getItems()
      .filter((item) => oldIds.includes(item.id) && newIds.includes(item.id));

    for (const item of updatedItems) {
      const n = newData.find((p) => p.id === item.id);
      wrap(item).assign(n);
    }
  }
}
