/**
 * 실시간 알림 서비스
 * 
 * WebSocket을 통한 실시간 알림 발송과 관리를 담당합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OrderTrackingGateway } from '../gateways/order-tracking.gateway';
import {
  RealtimeEvent,
  RealtimeEventType,
  OrderStatusUpdateEventDto,
  DriverLocationUpdateEventDto,
  DeliveryAssignmentEventDto,
  NotificationEventDto,
  SystemAlertEventDto,
  NotificationPriority,
  UserType
} from '../dto/realtime-events.dto';

/**
 * 알림 대상 정보 인터페이스
 */
interface NotificationTarget {
  userId: string;
  userType: UserType;
  deviceTokens?: string[]; // Push 알림용 (향후 확장)
}

/**
 * 룸 기반 알림 옵션 인터페이스
 */
interface RoomNotificationOptions {
  roomId: string;
  excludeUserIds?: string[];
  includeUserTypes?: UserType[];
  excludeUserTypes?: UserType[];
}

/**
 * 실시간 알림 서비스 클래스
 */
@Injectable()
export class RealtimeNotificationService {
  private readonly logger = new Logger(RealtimeNotificationService.name);

  constructor(
    private readonly orderTrackingGateway: OrderTrackingGateway
  ) {}

  /**
   * 주문 상태 변경 알림 발송
   */
  async sendOrderStatusUpdate(data: {
    orderId: string;
    status: string;
    previousStatus: string;
    message?: string;
    userId?: string;
    estimatedTimes?: {
      preparation?: number;
      delivery?: number;
      total?: number;
    };
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const event: OrderStatusUpdateEventDto = {
        eventType: RealtimeEventType.ORDER_STATUS_UPDATE,
        orderId: data.orderId,
        status: data.status,
        previousStatus: data.previousStatus,
        message: data.message,
        timestamp: new Date().toISOString(),
        userId: data.userId,
        estimatedTimes: data.estimatedTimes,
        metadata: data.metadata
      };

      // 주문 관련 룸에 브로드캐스트
      this.orderTrackingGateway.broadcastOrderStatusUpdate({
        orderId: data.orderId,
        status: data.status,
        message: data.message,
        metadata: { ...data.metadata, event }
      });

      this.logger.log(`Order status update sent for order ${data.orderId}: ${data.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send order status update: ${errorMessage}`);
    }
  }

  /**
   * 배달기사 위치 업데이트 알림 발송
   */
  async sendDriverLocationUpdate(data: {
    orderId: string;
    driverId: string;
    driverName: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    status: string;
    speed?: number;
    bearing?: number;
    estimatedArrivalTime?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const event: DriverLocationUpdateEventDto = {
        eventType: RealtimeEventType.DRIVER_LOCATION_UPDATE,
        orderId: data.orderId,
        driverId: data.driverId,
        driverName: data.driverName,
        location: data.location,
        status: data.status,
        speed: data.speed,
        bearing: data.bearing,
        estimatedArrivalTime: data.estimatedArrivalTime,
        timestamp: new Date().toISOString(),
        metadata: data.metadata
      };

      // 고객과 점주에게만 위치 정보 전송
      this.orderTrackingGateway.broadcastDriverLocationUpdate({
        orderId: data.orderId,
        driverId: data.driverId,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        status: data.status
      });

      this.logger.log(`Driver location update sent for order ${data.orderId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send driver location update: ${errorMessage}`);
    }
  }

  /**
   * 배달 배정 알림 발송
   */
  async sendDeliveryAssignment(data: {
    orderId: string;
    driverId: string;
    assignmentId: string;
    assignmentMethod: string;
    responseTimeoutMinutes?: number;
    specialInstructions?: string;
    orderDetails?: {
      restaurantName: string;
      customerName: string;
      items: Array<{ name: string; quantity: number; }>;
      pickupAddress: string;
      deliveryAddress: string;
      totalAmount: number;
    };
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const event: DeliveryAssignmentEventDto = {
        eventType: RealtimeEventType.DELIVERY_ASSIGNMENT,
        orderId: data.orderId,
        driverId: data.driverId,
        assignmentId: data.assignmentId,
        assignmentMethod: data.assignmentMethod,
        responseTimeoutMinutes: data.responseTimeoutMinutes,
        specialInstructions: data.specialInstructions,
        timestamp: new Date().toISOString(),
        orderDetails: data.orderDetails,
        metadata: data.metadata
      };

      // 배달기사에게 개인 알림 발송
      this.orderTrackingGateway.sendPersonalMessage(
        data.driverId,
        'delivery-assignment',
        event
      );

      // 관리자들에게도 알림
      this.orderTrackingGateway.broadcastToAdmins('delivery-assignment-created', {
        orderId: data.orderId,
        driverId: data.driverId,
        assignmentMethod: data.assignmentMethod
      });

      this.logger.log(`Delivery assignment notification sent to driver ${data.driverId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send delivery assignment notification: ${errorMessage}`);
    }
  }

  /**
   * 일반 알림 발송
   */
  async sendNotification(data: {
    title: string;
    message: string;
    priority: NotificationPriority;
    targets: NotificationTarget[];
    category?: string;
    actions?: Array<{
      label: string;
      action: string;
      data?: any;
    }>;
    imageUrl?: string;
    deepLink?: string;
    autoDissmissAfter?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      for (const target of data.targets) {
        const event: NotificationEventDto = {
          eventType: RealtimeEventType.NOTIFICATION,
          title: data.title,
          message: data.message,
          priority: data.priority,
          category: data.category,
          actions: data.actions,
          imageUrl: data.imageUrl,
          deepLink: data.deepLink,
          timestamp: new Date().toISOString(),
          userId: target.userId,
          autoDissmissAfter: data.autoDissmissAfter,
          metadata: data.metadata
        };

        // 개별 사용자에게 알림 발송
        this.orderTrackingGateway.sendPersonalMessage(
          target.userId,
          'notification',
          event
        );
      }

      this.logger.log(`Notification sent to ${data.targets.length} users: ${data.title}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send notification: ${errorMessage}`);
    }
  }

  /**
   * 시스템 알림 발송
   */
  async sendSystemAlert(data: {
    alertType: string;
    message: string;
    severity: NotificationPriority;
    affectedServices?: string[];
    estimatedResolutionTime?: number;
    targetUserTypes?: UserType[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const event: SystemAlertEventDto = {
        eventType: RealtimeEventType.SYSTEM_ALERT,
        alertType: data.alertType,
        message: data.message,
        severity: data.severity,
        affectedServices: data.affectedServices,
        estimatedResolutionTime: data.estimatedResolutionTime,
        timestamp: new Date().toISOString(),
        metadata: data.metadata
      };

      if (data.targetUserTypes?.includes(UserType.ADMIN) || !data.targetUserTypes) {
        // 관리자들에게 항상 시스템 알림 발송
        this.orderTrackingGateway.broadcastToAdmins('system-alert', event);
      }

      // 다른 사용자 타입에게도 필요한 경우 발송
      if (data.targetUserTypes) {
        // 현재는 관리자만 처리하지만, 향후 확장 가능
        // 예: 심각한 시스템 장애의 경우 모든 사용자에게 알림
      }

      this.logger.log(`System alert sent: ${data.alertType} (${data.severity})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send system alert: ${errorMessage}`);
    }
  }

  /**
   * 룸 기반 이벤트 브로드캐스트
   */
  async broadcastToRoom(
    roomId: string,
    eventType: string,
    data: any,
    options?: RoomNotificationOptions
  ): Promise<void> {
    try {
      // OrderTrackingGateway를 통해 룸에 브로드캐스트
      // 현재 게이트웨이에는 직접적인 룸 브로드캐스트 메서드가 없으므로
      // 주문 상태 업데이트 메서드를 활용하거나 새로운 메서드가 필요함
      
      this.logger.log(`Broadcasting ${eventType} to room ${roomId}`);
      
      // 향후 게이트웨이에 범용 룸 브로드캐스트 메서드 추가 필요
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to broadcast to room ${roomId}: ${errorMessage}`);
    }
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStats() {
    try {
      return this.orderTrackingGateway.getConnectionStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get connection stats: ${errorMessage}`);
      return {
        totalConnections: 0,
        userTypes: { customer: 0, owner: 0, driver: 0, admin: 0 },
        activeRooms: 0,
        rooms: []
      };
    }
  }

  /**
   * 배치 알림 발송 (다수의 사용자에게 동일한 알림)
   */
  async sendBatchNotification(data: {
    title: string;
    message: string;
    priority: NotificationPriority;
    userIds: string[];
    category?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const targets: NotificationTarget[] = data.userIds.map(userId => ({
        userId,
        userType: UserType.CUSTOMER // 기본값, 실제로는 사용자 정보 조회 필요
      }));

      await this.sendNotification({
        title: data.title,
        message: data.message,
        priority: data.priority,
        targets,
        category: data.category,
        metadata: data.metadata
      });

      this.logger.log(`Batch notification sent to ${data.userIds.length} users`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send batch notification: ${errorMessage}`);
    }
  }

  /**
   * 주문별 참여자들에게 알림 발송
   */
  async notifyOrderParticipants(
    orderId: string,
    eventType: string,
    data: any,
    excludeUserTypes?: UserType[]
  ): Promise<void> {
    try {
      const roomId = `order-${orderId}`;
      
      // 주문 관련 룸의 모든 참여자에게 알림
      // 실제 구현에서는 OrderTrackingGateway를 확장하여
      // 특정 조건에 맞는 사용자들에게만 발송하는 기능 필요
      
      this.logger.log(`Notifying order ${orderId} participants: ${eventType}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to notify order participants: ${errorMessage}`);
    }
  }
} 