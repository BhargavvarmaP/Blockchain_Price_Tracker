import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Alert } from '../../database/entities/alert.entity';
import { Price } from '../../database/entities/price.entity';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectRepository(Alert) private alertRepo: Repository<Alert>,
    @InjectRepository(Price) private priceRepo: Repository<Price>,
  ) {}

  async checkPriceAlerts() {
    try {
      const alerts = await this.alertRepo.find();
      const latestPrices = await this.priceRepo.find({ order: { createdAt: 'DESC' } });

      await Promise.all(
        alerts.map(async (alert) => {
          const latestPrice = latestPrices.find(price => price.chain === alert.chain);
          if (latestPrice && latestPrice.price >= alert.alertPrice) {
            await this.sendEmail(
              alert.email,
              `${alert.chain} Price Alert`,
              `The price of ${alert.chain} has reached $${latestPrice.price}.`
            );
            await this.alertRepo.delete(alert.id); 
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error checking price alerts:', error);
      throw new InternalServerErrorException('Failed to check price alerts');
    }
  }

  async addPriceAlert(email: string, chain: string, alertPrice: number) {
    try {
      const alert = this.alertRepo.create({ email, chain, alertPrice });
      return await this.alertRepo.save(alert);
    } catch (error) {
      this.logger.error('Error adding price alert:', error);
      throw new InternalServerErrorException('Failed to add price alert');
    }
  }

  async getAllAlerts() {
    try {
      return await this.alertRepo.find();
    } catch (error) {
      this.logger.error('Error fetching alerts:', error);
      throw new InternalServerErrorException('Failed to fetch alerts');
    }
  }

  async deleteAlertById(id: number) {
    try {
      await this.alertRepo.delete(id);
    } catch (error) {
      this.logger.error('Error deleting alert:', error);
      throw new InternalServerErrorException('Failed to delete alert');
    }
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
