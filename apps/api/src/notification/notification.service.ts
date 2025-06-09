import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { EmailNotificationService } from './email-notification.service';
import { SmsNotificationService } from './sms-notification.service';

/**
 * 통합 알림 서비스
 * 모든 알림 채널을 관리하는 중앙 서비스입니다.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private pushNotificationService: PushNotificationService,
    private emailNotificationService: EmailNotificationService,
    private smsNotificationService: SmsNotificationService,
  ) {}

  /**
   * 주문 상태 변경 시 알림 전송
   */
  async notifyOrderStatusChange(
    userId: string,
    orderId: string,
    status: string,
    userPreferences: any,
  ): Promise<void> {
    try {
      this.logger.log(`Sending order status notification: ${orderId} - ${status}`);

      // 푸시 알림 전송
      if (userPreferences.pushNotifications) {
        await this.pushNotificationService.sendOrderStatusNotification(
          userId,
          orderId,
          status,
          userPreferences.deviceTokens || [],
        );
      }

      // 이메일 알림 전송
      if (userPreferences.emailNotifications) {
        await this.emailNotificationService.sendOrderStatusEmail(
          userPreferences.email,
          orderId,
          status,
        );
      }

      // SMS 알림 전송 (중요한 상태 변경시에만)
      if (userPreferences.smsNotifications && ['confirmed', 'delivered'].includes(status)) {
        await this.smsNotificationService.sendOrderStatusSms(
          userPreferences.phone,
          orderId,
          status,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send order status notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 프로모션 알림 전송
   */
  async sendPromotionNotification(
    title: string,
    content: string,
    targetUsers?: string[],
  ): Promise<void> {
    try {
      this.logger.log(`Sending promotion notification: ${title}`);

      // 푸시 알림
      await this.pushNotificationService.sendPromotionNotification(
        title,
        content,
        undefined,
        targetUsers,
      );

      // 이메일 (필요한 경우)
      if (targetUsers) {
        for (const userId of targetUsers) {
          // 사용자 이메일 조회 후 전송
          // await this.emailNotificationService.sendPromotionEmail(email, title, content);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send promotion notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 