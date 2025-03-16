import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Configuratie
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Database
    MikroOrmModule.forRoot(),

    // Queue
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Feature modules
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 
