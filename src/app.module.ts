import { Module, MiddlewareConsumer } from '@nestjs/common'; // <-- Ensure MiddlewareConsumer is imported
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Price } from './database/entities/price.entity';
import { Alert } from './database/entities/alert.entity';
import { PriceModule } from './modules/price/price.module';
import { AlertModule } from './modules/alert/alert.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Price, Alert],
        synchronize: true,
      }),
    }),
    PriceModule,
    AlertModule,
  ],
})
export class AppModule {}
