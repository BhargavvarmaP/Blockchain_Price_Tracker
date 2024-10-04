// create-alert.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsNumber, IsString } from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({
    example: 'ethereum',
    description: 'The blockchain chain name (e.g., ethereum, polygon)',
  })
  @IsString()
  @IsNotEmpty()
  chain: string;

  @ApiProperty({
    example: 1000,
    description: 'The alert price in USD',
  })
  @IsNumber()
  @IsNotEmpty()
  alertPrice: number;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email to receive the alert notification',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
