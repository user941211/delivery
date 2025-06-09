import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PushNotificationService } from './push-notification.service';
import { EmailNotificationService } from './email-notification.service';
import { SmsNotificationService } from './sms-notification.service';

/**
 * 알림 시스템 모듈
 * 푸시 알림, 이메일, SMS 등 다양한 알림 채널을 관리합니다.
 */
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PushNotificationService,
    EmailNotificationService,
    SmsNotificationService,
  ],
  exports: [
    NotificationService,
    PushNotificationService,
    EmailNotificationService,
    SmsNotificationService,
  ],
})
export class NotificationModule {} 