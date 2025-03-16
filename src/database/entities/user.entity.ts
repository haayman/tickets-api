import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  @ApiProperty()
  email: string;

  @Property()
  password: string;

  @Property()
  @ApiProperty()
  firstName: string;

  @Property()
  @ApiProperty()
  lastName: string;

  @Property()
  @ApiProperty()
  isAdmin: boolean = false;

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();
} 
