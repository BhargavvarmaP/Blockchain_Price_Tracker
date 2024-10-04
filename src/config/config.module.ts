import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Price } from '../database/entities/price.entity';
import { Alert } from '../database/entities/alert.entity';

@Module({
  imports: [
    // Load environment variables from a .env file and enable global access
    NestConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule globally available
      envFilePath: '.env', // Specify the path to your .env file
    }),

    // Setup TypeORM for database connection
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres', 
        host: process.env.DATABASE_HOST,
        port: +process.env.DATABASE_PORT,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        entities: [Price, Alert], // Include all entities here
        synchronize: true, // Automatically sync schema, disable in production
        logging: true, // Enable logging for debugging
      }),
    }),
  ],
})
export class ConfigModule {}
