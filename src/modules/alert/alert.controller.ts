import {
  Controller,
  Post,
  Get,
  Param,
  Logger,
  InternalServerErrorException,
  HttpStatus,
  Res,
  Body,
} from '@nestjs/common';
import { AlertService } from './alert.service';
import {CreateAlertDto} from './dto/create-alert.dto';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Alerts') // Tag for grouping alerts-related endpoints in Swagger UI
@Controller('alerts')
export class AlertController {
  private readonly logger = new Logger(AlertController.name);

  constructor(private readonly alertService: AlertService) {}

  @Post('setAlerts')
@ApiOperation({ summary: 'Set a price alert' })
@ApiBody({ type: CreateAlertDto }) // Use the CreateAlertDto for request body structure
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Price alert set successfully.',
  schema: {
    example: {
      message: 'Price alert set for ethereum at $1000', // Example can be more descriptive
    },
  },
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: 'Failed to set price alert',
})
async setPriceAlert(
  @Body() alertData: CreateAlertDto, // Use CreateAlertDto for type safety
  @Res() res: Response,
) {
  try {
    await this.alertService.addPriceAlert(
      alertData.email,
      alertData.chain,
      alertData.alertPrice,
    );
    return res.status(HttpStatus.CREATED).json({
      message: `Price alert set for ${alertData.chain} at $${alertData.alertPrice}`,
    });
  } catch (error) {
    this.logger.error('Error setting price alert:', error);
    throw new InternalServerErrorException('Failed to set price alert');
  }
}


  // Endpoint to get all active alerts
  @Get('getAlerts')
  @ApiOperation({ summary: 'Get all active alerts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active alerts fetched successfully.',
    schema: {
      example: {
        message: 'Active alerts fetched successfully.',
        data: [], // replace with actual alert structure
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch active alerts',
  })
  async getAllActiveAlerts(@Res() res: Response) {
    try {
      const alerts = await this.alertService.getAllAlerts();
      return res.status(HttpStatus.OK).json({
        message: 'Active alerts fetched successfully.',
        data: alerts,
      });
    } catch (error) {
      this.logger.error('Error fetching active alerts:', error);
      throw new InternalServerErrorException('Failed to fetch active alerts');
    }
  }

  // Endpoint to delete a specific alert
  @Post('delete/:id')
  @ApiOperation({ summary: 'Delete a specific alert by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the alert to delete',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert deleted successfully.',
    schema: {
      example: {
        message: 'Alert with ID [id] deleted successfully.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to delete alert',
  })
  async deleteAlert(@Param('id') id: number, @Res() res: Response) {
    try {
      await this.alertService.deleteAlertById(id);
      return res.status(HttpStatus.OK).json({
        message: `Alert with ID ${id} deleted successfully.`,
      });
    } catch (error) {
      this.logger.error('Error deleting alert:', error);
      throw new InternalServerErrorException('Failed to delete alert');
    }
  }
}
