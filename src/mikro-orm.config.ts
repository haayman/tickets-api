import { Options } from '@mikro-orm/core';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { User, Uitvoering, Reservering, Ticket, Voorstelling, Prijs, Payment, Log, StatusUpdate } from './database/entities';

const config: Options = {
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  dbName: process.env.DATABASE_NAME,
  entities: [User, Uitvoering, Reservering, Ticket, Voorstelling, Prijs, Payment, Log, StatusUpdate],
  debug: process.env.NODE_ENV === 'development',
  metadataProvider: TsMorphMetadataProvider,
  migrations: {
    path: 'src/database/migrations',
  },
};

export default config; 
