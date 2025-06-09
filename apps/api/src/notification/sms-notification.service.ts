import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);

  async sendOrderStatusSms(phone: string, orderId: string, status: string): Promise<boolean> {
    this.logger.log(`Sending SMS to ${phone} for order ${orderId} status ${status}`);
    return true;
  }
} 