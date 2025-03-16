import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import stackTrace from "stack-trace";
import { ApiProperty } from '@nestjs/swagger';
import { Reservering } from './reservering.entity';
import { Logger } from '@nestjs/common';
import { basename } from 'path';

@Entity({ tableName: 'logs' })
export class Log {
  constructor(message: string, sourceCode: string) {
    this.message = message;
    this.source_code = sourceCode;
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
  message: string;

  @Property()
  @ApiProperty()
  source_code: string;

  @ManyToOne(() => Reservering)
  reservering: Reservering;

  @Property()
  @ApiProperty()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  @ApiProperty()
  updatedAt: Date = new Date();

  toString(): string {
    return this.message;
  }

  /**
   * Voeg een log bericht toe aan een reservering
   * @param reservering De reservering om het bericht aan toe te voegen
   * @param message Het bericht
   */
  static addMessage(reservering: Reservering, message: string): void {
    try {
      const trace = stackTrace.get();
      const caller = trace[1];

      const log = new Log(
        message,
        `${basename(caller.getFileName())}(${caller.getLineNumber()})`
      );

      reservering.logs.add(log);
      Logger.log(`${reservering} ${message}`);
    } catch (e) {
      // geen error als het loggen mislukt
      Logger.info(message);
      Logger.error(e);
    }
  }
} 
