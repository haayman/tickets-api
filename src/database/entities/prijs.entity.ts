import { Entity, PrimaryKey, Property, ManyToOne, OnInit, wrap } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Voorstelling } from './voorstelling.entity';

@Entity({ tableName: 'prijzen' })
export class Prijs {
  @PrimaryKey()
  @ApiProperty()
  id: number;

  @Property()
  @ApiProperty()
  description: string;

  @Property()
  @ApiProperty()
  prijs: number = 0;

  @Property()
  @ApiProperty({ required: false })
  role?: string;

  @ManyToOne(() => Voorstelling)
  voorstelling: Voorstelling;

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  toString(): string {
    return this.description;
  }

  @OnInit()
  toNumeric(): void {
    // prijs is als 'decimal' opgeslagen, wat mikro-orm niet herkent
    this.prijs = +this.prijs;
  }

  toJSON(strict = true, strip = [], ...args: any[]): any {
    const o = wrap(this, true).toObject(...args);
    o.prijs = +this.prijs;
    delete o.voorstelling;
    return o;
  }
} 
