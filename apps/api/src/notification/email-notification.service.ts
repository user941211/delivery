import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  async sendOrderStatusEmail(email: string, orderId: string, status: string): Promise<boolean> {
    this.logger.log(`Sending email to ${email} for order ${orderId} status ${status}`);
    return true;
  }
} 