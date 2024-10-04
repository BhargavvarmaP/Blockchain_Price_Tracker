import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { Price } from '../../database/entities/price.entity';
import { AlertService } from '../alert/alert.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

@ApiTags('prices')
@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly moralisApiUrl = 'https://deep-index.moralis.io/api/v2.2/market-data/global/market-cap';

  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    private alertService: AlertService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @ApiOperation({ summary: 'Fetch and save latest prices' })
  @ApiResponse({ status: 200, description: 'Prices saved successfully.' })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch or save prices' })
  async fetchAndSavePrices() {
    this.logger.log('Cron job triggered at: ' + new Date().toISOString());
    try {
      const response = await axios.get(this.moralisApiUrl, {
        headers: { 'X-API-Key': process.env.MORALIS_API_KEY },
      });
      const filteredData = this.filterPriceData(response.data);
      await this.savePrices(filteredData);
      this.logger.log('Prices saved successfully.');

      await this.alertService.checkPriceAlerts(); // Check alerts after saving prices
    } catch (error) {
      this.logger.error('Error fetching or saving prices:', error);
      throw new InternalServerErrorException('Failed to fetch or save prices');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @ApiOperation({ summary: 'Check for price increases' })
  async handleCron() {
    this.logger.log('Checking for price increases...');
    await this.checkPriceIncreases();
  }

  @ApiOperation({ summary: 'Get the latest prices' })
  @ApiResponse({ status: 200, description: 'Latest prices fetched successfully.' })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch latest prices' })
  async getLatestPrices() {
    try {
      return await this.priceRepo.find({ order: { createdAt: 'DESC' }, take: 2 });
    } catch (error) {
      this.logger.error('Error fetching latest prices:', error);
      throw new InternalServerErrorException('Failed to fetch latest prices');
    }
  }

  @ApiOperation({ summary: 'Get prices from one hour ago' })
  @ApiResponse({ status: 200, description: 'Prices from one hour ago fetched successfully.' })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch prices from one hour ago' })
  async getOneHourAgoPrices() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // One hour ago
    return await this.priceRepo.find({
      where: {
        createdAt: Between(oneHourAgo, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 2, // Adjust this based on your requirements
    });
  }

  private filterPriceData(data: any): Array<{ name: string; symbol: string; usd_price: number }> {
    return data.filter(item => ['eth', 'matic'].includes(item.symbol.toLowerCase()));
  }

  private async savePrices(filteredData: Array<{ name: string; usd_price: number }>) {
    for (const item of filteredData) {
      const priceEntry = this.priceRepo.create({
        chain: item.name,
        price: item.usd_price,
        createdAt: new Date(),
      });
      await this.priceRepo.save(priceEntry);
      this.logger.log(`Saved price for ${item.name}: $${item.usd_price}`);
    }
  }

  @ApiOperation({ summary: 'Get hourly prices for the last 24 hours' })
  @ApiResponse({ status: 200, description: 'Hourly prices fetched successfully.' })
  @ApiInternalServerErrorResponse({ description: 'Failed to fetch hourly prices' })
  async getHourlyPrices() {
    try {
      const prices = await this.getPricesFromLast24Hours();
      return this.groupPricesByHour(prices);
    } catch (error) {
      this.logger.error('Error fetching hourly prices:', error);
      throw new InternalServerErrorException('Failed to fetch hourly prices');
    }
  }

  private async getPricesFromLast24Hours() {
    const currentTime = new Date();
    const startTime = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    return await this.priceRepo.find({
      where: { createdAt: Between(startTime, currentTime) },
      order: { createdAt: 'ASC' },
    });
  }

  private groupPricesByHour(prices: Price[]): Array<{ hour: string; chain: string; price: number }> {
    const grouped: { [key: string]: Array<{ chain: string; price: number }> } = {};
    for (const price of prices) {
      const hourKey = this.roundToNearestHour(price.createdAt).toISOString();
      if (!grouped[hourKey]) grouped[hourKey] = [];
      grouped[hourKey].push({ chain: price.chain, price: price.price });
    }

    const hourlyPrices: Array<{ hour: string; chain: string; price: number }> = [];
    for (const hour in grouped) {
      for (const priceInfo of grouped[hour]) {
        hourlyPrices.push({ hour, chain: priceInfo.chain, price: priceInfo.price });
      }
    }

    return hourlyPrices;
  }

  private roundToNearestHour(date: Date): Date {
    const ms = 1000 * 60 * 60; // milliseconds in an hour
    return new Date(Math.round(date.getTime() / ms) * ms);
  }

  async checkPriceIncreases() {
    try {
      const latestPrices = await this.getLatestPrices();
      const oneHourAgoPrices = await this.getOneHourAgoPrices();

      await Promise.all(
        latestPrices.map(async (latest) => {
          const oneHourAgoPrice = oneHourAgoPrices.find(price => price.chain === latest.chain);
          
          if (oneHourAgoPrice) {
            const priceIncreasePercentage = this.calculatePriceIncreasePercentage(
              oneHourAgoPrice.price,
              latest.price,
            );

            // Send an email if the price increased by more than 3%
            if (priceIncreasePercentage > 3) {
              await this.sendEmail(
                'hyperhire_assignment@hyperhire.in',
                `${latest.chain} Price Increase Alert`,
                `The price of ${latest.chain} has increased by more than 3%. Current price: $${latest.price}. Price an hour ago: $${oneHourAgoPrice.price}.`,
              );
            }
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error checking price increases:', error);
      throw new InternalServerErrorException('Failed to check price increases');
    }
  }

  private calculatePriceIncreasePercentage(oldPrice: number, newPrice: number): number {
    if (oldPrice === 0) return 0; // Prevent division by zero
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  private async sendEmail(to: string, subject: string, text: string) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'loren.miller83@ethereal.email',
        pass: 'ebj3JrvpkswVU6zBeH',
      },
    });

    await transporter.sendMail({
      from: 'loren.miller83@ethereal.email',
      to,
      subject,
      text,
    });
  }
}
