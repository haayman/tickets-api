import { Entity, PrimaryKey, Property, OneToMany, Collection, Filter, wrap } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Uitvoering } from './uitvoering.entity';
import { Prijs } from './prijs.entity';

@Filter({
  name: 'active',
  cond: { active: true },
  default: true,
})
@Entity({ tableName: 'voorstellingen' })
export class Voorstelling {
  @PrimaryKey()
  @ApiProperty()
  id: number;

  @Property()
  @ApiProperty()
  title: string;

  @Property()
  @ApiProperty()
  description: string;

  @Property()
  @ApiProperty()
  active: boolean = true;

  @Property()
  @ApiProperty({ required: false })
  url?: string;

  @Property()
  @ApiProperty({ required: false })
  locatie?: string;

  @Property()
  @ApiProperty({ required: false })
  opmerkingen?: string;

  @Property()
  @ApiProperty({ required: false })
  poster?: string;

  @Property()
  @ApiProperty({ required: false })
  thumbnail?: string;

  @OneToMany(() => Prijs, prijs => prijs.voorstelling, {
    orphanRemoval: true,
  })
  prijzen = new Collection<Prijs>(this);

  @OneToMany(() => Uitvoering, uitvoering => uitvoering.voorstelling, {
    orphanRemoval: true,
  })
  uitvoeringen = new Collection<Uitvoering>(this);

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  /**
   * mikro-orm assign werkt niet goed met nieuwe/verwijderde prijzen/uitvoeringen
   * @param collection De collectie om bij te werken
   * @param newData De nieuwe data
   */
  updateNestedEntities(collection: Collection<any>, newData: any[]) {
    const oldIds = collection.getItems().map(item => item.id);
    const newIds = newData.map(item => item.id);

    const updatedItems = collection
      .getItems()
      .filter(item => oldIds.includes(item.id) && newIds.includes(item.id));

    for (const item of updatedItems) {
      const n = newData.find(p => p.id === item.id);
      wrap(item).assign(n);
    }
  }
} 
