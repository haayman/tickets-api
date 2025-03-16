import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Reservering } from './reservering.entity';

@Entity({ tableName: 'statusupdates' })
export class StatusUpdate {
  constructor(status: string) {
    this.status = status;
    this.created_at = new Date();
  }

  @PrimaryKey()
  @ApiProperty()
  id: number;

  @Property()
  @ApiProperty()
  created_at: Date = new Date();

  @Property()
  @ApiProperty()
  status: string;

  @ManyToOne(() => Reservering)
  reservering: Reservering;

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  toString(): string {
    return this.status;
  }
} 
