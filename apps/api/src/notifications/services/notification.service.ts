/**
 * 알림 서비스
 * 
 * 점주용 실시간 알림 관리 및 WebSocket 통신을 담당합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  NotificationDto, 
  NotificationType, 
  NotificationPriority, 
  NewOrderNotificationDto, 
  OrderStatusChangeNotificationDto 
} from '../dto/notification.dto';

/**
 * 연결된 클라이언트 정보 인터페이스
 */
interface ConnectedClient {
  clientId: string;
  ownerId: string;
  restaurantId: string;
  socket: any; // WebSocket 객체
  connectedAt: Date;
  subscribedTypes: NotificationType[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private connectedClients = new Map<string, ConnectedClient>();
  private notificationHistory = new Map<string, NotificationDto[]>();

  /**
   * 클라이언트 연결 등록
   */
  addClient(clientId: string, ownerId: string, restaurantId: string, socket: any): void {
    const client: ConnectedClient = {
      clientId,
      ownerId,
      restaurantId,
      socket,
      connectedAt: new Date(),
      subscribedTypes: Object.values(NotificationType) // 기본적으로 모든 타입 구독
    };

    this.connectedClients.set(clientId, client);
    this.logger.log(`Client connected: ${clientId} (Owner: ${ownerId}, Restaurant: ${restaurantId})`);

    // 연결 성공 메시지 전송
    this.sendToClient(clientId, {
      type: 'connection',
      status: 'connected',
      message: '실시간 알림 서비스에 성공적으로 연결되었습니다.',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 클라이언트 연결 해제
   */
  removeClient(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      this.connectedClients.delete(clientId);
      this.logger.log(`Client disconnected: ${clientId} (Owner: ${client.ownerId})`);
    }
  }

  /**
   * 클라이언트 구독 타입 업데이트
   */
  updateClientSubscription(clientId: string, types: NotificationType[]): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.subscribedTypes = types;
      this.logger.log(`Updated subscription for client ${clientId}: ${types.join(', ')}`);
    }
  }

  /**
   * 새 주문 알림 전송
   */
  async sendNewOrderNotification(
    ownerId: string, 
    restaurantId: string, 
    orderData: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      orderAmount: number;
      itemCount: number;
      specialRequests?: string;
    }
  ): Promise<void> {
    const notification: NewOrderNotificationDto = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.NEW_ORDER,
      ownerId,
      restaurantId,
      title: '새로운 주문 접수',
      message: `${orderData.customerName}님의 주문이 접수되었습니다. (${orderData.orderNumber})`,
      priority: NotificationPriority.HIGH,
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      orderAmount: orderData.orderAmount,
      itemCount: orderData.itemCount,
      specialRequests: orderData.specialRequests,
      createdAt: new Date().toISOString(),
      data: {
        orderAmount: orderData.orderAmount,
        customerName: orderData.customerName,
        itemCount: orderData.itemCount
      }
    };

    await this.broadcastToRestaurant(restaurantId, notification);
    this.saveNotificationHistory(ownerId, notification);
  }

  /**
   * 주문 상태 변경 알림 전송
   */
  async sendOrderStatusChangeNotification(
    ownerId: string,
    restaurantId: string,
    statusData: {
      orderId: string;
      orderNumber: string;
      previousStatus: string;
      currentStatus: string;
      reason?: string;
    }
  ): Promise<void> {
    const notification: OrderStatusChangeNotificationDto = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.ORDER_STATUS_CHANGE,
      ownerId,
      restaurantId,
      title: '주문 상태 변경',
      message: `주문 ${statusData.orderNumber}의 상태가 ${statusData.previousStatus}에서 ${statusData.currentStatus}로 변경되었습니다.`,
      priority: this.getStatusChangePriority(statusData.currentStatus),
      orderId: statusData.orderId,
      orderNumber: statusData.orderNumber,
      previousStatus: statusData.previousStatus,
      currentStatus: statusData.currentStatus,
      reason: statusData.reason,
      createdAt: new Date().toISOString(),
      data: {
        previousStatus: statusData.previousStatus,
        currentStatus: statusData.currentStatus
      }
    };

    await this.broadcastToRestaurant(restaurantId, notification);
    this.saveNotificationHistory(ownerId, notification);
  }

  /**
   * 결제 상태 변경 알림 전송
   */
  async sendPaymentStatusChangeNotification(
    ownerId: string,
    restaurantId: string,
    paymentData: {
      orderId: string;
      orderNumber: string;
      paymentStatus: string;
      amount: number;
    }
  ): Promise<void> {
    const notification: NotificationDto = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.PAYMENT_STATUS_CHANGE,
      ownerId,
      restaurantId,
      title: '결제 상태 변경',
      message: `주문 ${paymentData.orderNumber}의 결제가 ${paymentData.paymentStatus} 상태로 변경되었습니다.`,
      priority: paymentData.paymentStatus === 'FAILED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      orderId: paymentData.orderId,
      createdAt: new Date().toISOString(),
      data: {
        paymentStatus: paymentData.paymentStatus,
        amount: paymentData.amount
      }
    };

    await this.broadcastToRestaurant(restaurantId, notification);
    this.saveNotificationHistory(ownerId, notification);
  }

  /**
   * 주문 취소 알림 전송
   */
  async sendOrderCancelledNotification(
    ownerId: string,
    restaurantId: string,
    cancelData: {
      orderId: string;
      orderNumber: string;
      reason: string;
      cancelledBy: 'customer' | 'restaurant' | 'system';
    }
  ): Promise<void> {
    const notification: NotificationDto = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.ORDER_CANCELLED,
      ownerId,
      restaurantId,
      title: '주문 취소',
      message: `주문 ${cancelData.orderNumber}이 취소되었습니다. (사유: ${cancelData.reason})`,
      priority: NotificationPriority.HIGH,
      orderId: cancelData.orderId,
      createdAt: new Date().toISOString(),
      data: {
        reason: cancelData.reason,
        cancelledBy: cancelData.cancelledBy
      }
    };

    await this.broadcastToRestaurant(restaurantId, notification);
    this.saveNotificationHistory(ownerId, notification);
  }

  /**
   * 시스템 공지 알림 전송
   */
  async sendSystemNotice(
    ownerId: string,
    restaurantId: string,
    notice: {
      title: string;
      message: string;
      priority?: NotificationPriority;
      expiresAt?: string;
    }
  ): Promise<void> {
    const notification: NotificationDto = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.SYSTEM_NOTICE,
      ownerId,
      restaurantId,
      title: notice.title,
      message: notice.message,
      priority: notice.priority || NotificationPriority.NORMAL,
      createdAt: new Date().toISOString(),
      expiresAt: notice.expiresAt,
      data: {}
    };

    await this.broadcastToRestaurant(restaurantId, notification);
    this.saveNotificationHistory(ownerId, notification);
  }

  /**
   * 특정 매장의 모든 연결된 클라이언트에게 알림 전송
   */
  private async broadcastToRestaurant(restaurantId: string, notification: NotificationDto): Promise<void> {
    const restaurantClients = Array.from(this.connectedClients.values())
      .filter(client => 
        client.restaurantId === restaurantId && 
        client.subscribedTypes.includes(notification.type)
      );

    if (restaurantClients.length === 0) {
      this.logger.warn(`No connected clients for restaurant ${restaurantId}`);
      return;
    }

    for (const client of restaurantClients) {
      this.sendToClient(client.clientId, notification);
    }

    this.logger.log(`Broadcasted notification to ${restaurantClients.length} clients for restaurant ${restaurantId}`);
  }

  /**
   * 특정 클라이언트에게 메시지 전송
   */
  private sendToClient(clientId: string, data: any): void {
    const client = this.connectedClients.get(clientId);
    if (client && client.socket) {
      try {
        client.socket.emit('notification', data);
      } catch (error) {
        this.logger.error(`Failed to send notification to client ${clientId}:`, error);
        // 연결이 끊어진 클라이언트 제거
        this.removeClient(clientId);
      }
    }
  }

  /**
   * 알림 히스토리 저장
   */
  private saveNotificationHistory(ownerId: string, notification: NotificationDto): void {
    if (!this.notificationHistory.has(ownerId)) {
      this.notificationHistory.set(ownerId, []);
    }

    const history = this.notificationHistory.get(ownerId);
    history.push(notification);

    // 최대 100개까지만 보관
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * 상태 변경에 따른 우선순위 결정
   */
  private getStatusChangePriority(status: string): NotificationPriority {
    switch (status.toUpperCase()) {
      case 'CANCELLED':
      case 'FAILED':
        return NotificationPriority.HIGH;
      case 'CONFIRMED':
      case 'COMPLETED':
        return NotificationPriority.NORMAL;
      default:
        return NotificationPriority.LOW;
    }
  }

  /**
   * 점주의 알림 히스토리 조회
   */
  getNotificationHistory(ownerId: string, limit: number = 20): NotificationDto[] {
    const history = this.notificationHistory.get(ownerId) || [];
    return history.slice(-limit).reverse(); // 최신순으로 반환
  }

  /**
   * 연결된 클라이언트 수 조회
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * 특정 매장의 연결된 클라이언트 수 조회
   */
  getRestaurantClientsCount(restaurantId: string): number {
    return Array.from(this.connectedClients.values())
      .filter(client => client.restaurantId === restaurantId)
      .length;
  }

  /**
   * 클라이언트 연결 상태 확인
   */
  isClientConnected(ownerId: string, restaurantId: string): boolean {
    return Array.from(this.connectedClients.values())
      .some(client => client.ownerId === ownerId && client.restaurantId === restaurantId);
  }
} 