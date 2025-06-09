import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 푸시 알림 타입 정의
export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  action?: string;
}

// 알림 대상 정의
export interface NotificationTarget {
  userId: string;
  deviceTokens: string[];
  platform: 'ios' | 'android' | 'web';
}

// 알림 템플릿 정의
export interface NotificationTemplate {
  type: 'order_confirmed' | 'order_preparing' | 'order_ready' | 'order_delivering' | 'order_delivered' | 'promotion' | 'general';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * 푸시 알림 서비스
 * Firebase Cloud Messaging (FCM)을 사용하여 푸시 알림을 전송합니다.
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 단일 사용자에게 푸시 알림 전송
   */
  async sendToUser(
    userId: string,
    notification: PushNotificationData,
    deviceTokens: string[],
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending push notification to user ${userId}`);
      
      // 실제 구현에서는 Firebase Admin SDK 사용
      // const message = {
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //     imageUrl: notification.imageUrl,
      //   },
      //   data: notification.data || {},
      //   tokens: deviceTokens,
      // };
      
      // const response = await admin.messaging().sendMulticast(message);
      
      // 시뮬레이션 로그
      this.logger.debug(`Push notification sent: ${notification.title}`);
      this.logger.debug(`Device tokens: ${deviceTokens.join(', ')}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 여러 사용자에게 푸시 알림 전송
   */
  async sendToMultipleUsers(
    targets: NotificationTarget[],
    notification: PushNotificationData,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const target of targets) {
      const result = await this.sendToUser(
        target.userId,
        notification,
        target.deviceTokens,
      );
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Bulk notification sent: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * 토픽 기반 푸시 알림 전송 (예: 모든 사용자)
   */
  async sendToTopic(
    topic: string,
    notification: PushNotificationData,
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending push notification to topic: ${topic}`);
      
      // 실제 구현에서는 Firebase Admin SDK 사용
      // const message = {
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //     imageUrl: notification.imageUrl,
      //   },
      //   data: notification.data || {},
      //   topic: topic,
      // };
      
      // const response = await admin.messaging().send(message);
      
      this.logger.debug(`Topic notification sent: ${notification.title}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send topic notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 주문 상태 변경 알림
   */
  async sendOrderStatusNotification(
    userId: string,
    orderId: string,
    status: string,
    deviceTokens: string[],
  ): Promise<boolean> {
    const templates: Record<string, NotificationTemplate> = {
      confirmed: {
        type: 'order_confirmed',
        title: '주문이 접수되었습니다! 🎉',
        body: '음식점에서 주문을 확인했습니다. 곧 조리를 시작합니다.',
        data: { orderId, status, action: 'view_order' },
      },
      preparing: {
        type: 'order_preparing',
        title: '조리를 시작합니다! 👨‍🍳',
        body: '음식점에서 맛있는 음식을 조리하고 있습니다.',
        data: { orderId, status, action: 'view_order' },
      },
      ready: {
        type: 'order_ready',
        title: '조리가 완료되었습니다! ✅',
        body: '곧 배달기사가 픽업하러 갑니다.',
        data: { orderId, status, action: 'view_order' },
      },
      delivering: {
        type: 'order_delivering',
        title: '배달이 시작되었습니다! 🚗',
        body: '배달기사가 음식을 가지고 출발했습니다.',
        data: { orderId, status, action: 'track_order' },
      },
      delivered: {
        type: 'order_delivered',
        title: '배달이 완료되었습니다! 🎉',
        body: '맛있게 드세요! 리뷰를 남겨주시면 감사하겠습니다.',
        data: { orderId, status, action: 'write_review' },
      },
    };

    const template = templates[status];
    if (!template) {
      this.logger.warn(`Unknown order status: ${status}`);
      return false;
    }

    return this.sendToUser(userId, template, deviceTokens);
  }

  /**
   * 프로모션 알림 전송
   */
  async sendPromotionNotification(
    title: string,
    body: string,
    imageUrl?: string,
    targetUsers?: string[],
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title,
      body,
      imageUrl,
      data: {
        type: 'promotion',
        action: 'view_promotion',
      },
    };

    if (targetUsers && targetUsers.length > 0) {
      // 특정 사용자들에게 전송 (실제로는 device token을 조회해야 함)
      this.logger.log(`Sending promotion to ${targetUsers.length} users`);
      return true;
    } else {
      // 모든 사용자에게 전송
      return this.sendToTopic('all_users', notification);
    }
  }

  /**
   * 배달기사 알림
   */
  async sendDriverNotification(
    driverId: string,
    type: 'new_delivery' | 'delivery_reminder',
    orderId: string,
    deviceTokens: string[],
  ): Promise<boolean> {
    const templates = {
      new_delivery: {
        title: '새로운 배달 요청! 📦',
        body: '새로운 배달 요청이 있습니다. 확인해주세요.',
        data: { orderId, type: 'new_delivery', action: 'accept_delivery' },
      },
      delivery_reminder: {
        title: '배달 진행 알림 ⏰',
        body: '고객이 배달을 기다리고 있습니다.',
        data: { orderId, type: 'delivery_reminder', action: 'update_status' },
      },
    };

    const template = templates[type];
    return this.sendToUser(driverId, template, deviceTokens);
  }

  /**
   * 점주 알림
   */
  async sendRestaurantOwnerNotification(
    ownerId: string,
    type: 'new_order' | 'review_received',
    data: any,
    deviceTokens: string[],
  ): Promise<boolean> {
    const templates = {
      new_order: {
        title: '새로운 주문이 들어왔습니다! 🔔',
        body: `${data.customerName}님의 주문이 접수되었습니다.`,
        data: { orderId: data.orderId, type: 'new_order', action: 'view_order' },
      },
      review_received: {
        title: '새로운 리뷰가 등록되었습니다! ⭐',
        body: `${data.rating}점 리뷰가 등록되었습니다.`,
        data: { reviewId: data.reviewId, type: 'review_received', action: 'view_review' },
      },
    };

    const template = templates[type];
    return this.sendToUser(ownerId, template, deviceTokens);
  }

  /**
   * 디바이스 토큰 등록/업데이트
   */
  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<boolean> {
    try {
      // 실제 구현에서는 데이터베이스에 저장
      this.logger.log(`Registering device token for user ${userId} on ${platform}`);
      
      // 토픽 구독 (예: 모든 사용자)
      // await admin.messaging().subscribeToTopic([deviceToken], 'all_users');
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to register device token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 디바이스 토큰 제거
   */
  async unregisterDeviceToken(
    userId: string,
    deviceToken: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Unregistering device token for user ${userId}`);
      
      // 토픽 구독 해제
      // await admin.messaging().unsubscribeFromTopic([deviceToken], 'all_users');
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unregister device token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 알림 설정 업데이트
   */
  async updateNotificationSettings(
    userId: string,
    settings: {
      orderUpdates: boolean;
      promotions: boolean;
      deliveryUpdates: boolean;
      generalNotifications: boolean;
    },
  ): Promise<boolean> {
    try {
      this.logger.log(`Updating notification settings for user ${userId}`);
      
      // 실제 구현에서는 데이터베이스에 저장
      // await this.userRepository.updateNotificationSettings(userId, settings);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 알림 전송 로그 기록
   */
  private async logNotification(
    userId: string,
    type: string,
    title: string,
    success: boolean,
  ): Promise<void> {
    try {
      // 실제 구현에서는 데이터베이스에 로그 저장
      this.logger.debug(`Notification log: ${userId} - ${type} - ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      this.logger.error(`Failed to log notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 