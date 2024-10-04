import {
  Controller,
  Get,
  Post,
  Logger,
  InternalServerErrorException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { PriceService } from './price.service';
import { Response } from 'express';
import { ApiTags, ApiOkResponse, ApiNotFoundResponse, ApiInternalServerErrorResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('prices')
@Controller('prices')
export class PriceController {
  private readonly logger = new Logger(PriceController.name);

  constructor(private readonly priceService: PriceService) {}

  // Endpoint to get the latest prices
  @Get('latest')
  @ApiOperation({ summary: 'Fetch latest prices for Ethereum and Polygon' })
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Latest prices fetched successfully',
    schema: {
      example: {
        message: 'Latest prices fetched successfully',
        ethPrice: 'N/A',
        maticPrice: 'N/A',
      },
    },
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No price data available.',
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch latest prices',
  })
  async getLatestPrices(@Res() res: Response) {
    try {
      // Fetch the latest prices from the service
      const prices = await this.priceService.getLatestPrices();

      if (!prices || prices.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No price data available.',
        });
      }

      // Extract Ethereum and MATIC prices from the fetched data
      const ethPrice = prices.find((price) => price.chain.toLowerCase() === 'ethereum')?.price;
      const maticPrice = prices.find((price) => price.chain.toLowerCase() === 'polygon')?.price;

      return res.status(HttpStatus.OK).json({
        message: 'Latest prices fetched successfully',
        ethPrice: ethPrice || 'N/A',
        maticPrice: maticPrice || 'N/A',
      });
    } catch (error) {
      this.logger.error('Error fetching latest prices:', error);
      throw new InternalServerErrorException('Failed to fetch latest prices');
    }
  }

  // Endpoint to manually trigger fetching and saving prices
  @Post('fetch')
  @ApiOperation({ summary: 'Manually fetch and save the latest prices' })
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Prices fetched and saved successfully.',
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch prices manually',
  })
  async manualFetchPrices(@Res() res: Response) {
    this.logger.log('Received request to fetch prices'); 
    try {
      await this.priceService.fetchAndSavePrices();
      return res.status(HttpStatus.OK).json({
        message: 'Prices fetched and saved successfully.',
      });
    } catch (error) {
      this.logger.error('Error manually fetching prices:', error);
      throw new InternalServerErrorException('Failed to fetch prices manually');
    }
  }

  // Endpoint to fetch hourly prices for a specific chain
  @Get('hourly')
  @ApiOperation({ summary: 'Fetch hourly prices for a specific chain' })
  @ApiOkResponse({
    status: HttpStatus.OK,
    description: 'Hourly prices fetched successfully.',
    schema: {
      example: {
        message: 'Hourly prices fetched successfully.',
        data: [], // Add an example structure of hourly prices here
      },
    },
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch hourly prices',
  })
  async getHourlyPrices(@Res() res: Response) {
    try {
      const hourlyPrices = await this.priceService.getHourlyPrices(); // Call without passing 'chain'

      return res.status(HttpStatus.OK).json({
        message: 'Hourly prices fetched successfully.',
        data: hourlyPrices,
      });
    } catch (error) {
      this.logger.error('Error fetching hourly prices:', error);
      throw new InternalServerErrorException('Failed to fetch hourly prices');
    }
  }
}
