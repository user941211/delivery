import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
  ) {}

  @Post('device-token')
  async registerDeviceToken(@Body() body: any) {
    return this.pushNotificationService.registerDeviceToken(
      body.userId,
      body.deviceToken,
      body.platform,
    );
  }

  @Post('test')
  async sendTestNotification(@Body() body: any) {
    return this.pushNotificationService.sendToUser(
      body.userId,
      body.notification,
      body.deviceTokens,
    );
  }
} 