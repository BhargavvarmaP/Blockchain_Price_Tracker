import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { Price } from '../../database/entities/price.entity';
import { AlertModule } from '../alert/alert.module'; // Import AlertModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Price]),
    forwardRef(() => AlertModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [PriceService],
  controllers: [PriceController],
  exports: [PriceService,TypeOrmModule.forFeature([Price])],
})
export class PriceModule {}
