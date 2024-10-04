import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { Alert } from '../../database/entities/alert.entity';
import { PriceModule } from '../price/price.module'; // Import the PriceModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]), // Import the Alert entity
    forwardRef(() => PriceModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [AlertService], // Register the AlertService
  controllers: [AlertController], // Register the AlertController
  exports: [AlertService], // Export AlertService if needed in other modules
})
export class AlertModule {}
