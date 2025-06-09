/**
 * 실시간 알림 WebSocket 게이트웨이
 * 
 * Socket.IO를 사용하여 점주용 실시간 알림을 처리합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { 
  SubscribeNotificationDto, 
  ConnectionStatusDto, 
  NotificationType 
} from '../dto/notification.dto';

/**
 * WebSocket 연결 정보 인터페이스
 */
interface SocketWithAuth {
  id: string;
  ownerId?: string;
  restaurantId?: string;
  clientId?: string;
  handshake: {
    query: Record<string, any>;
  };
  emit: (event: string, data: any) => void;
  disconnect: (close?: boolean) => void;
  join: (room: string) => Promise<void>;
}

/**
 * 임시 WebSocket 게이트웨이 구현
 * 
 * 실제 Socket.IO 의존성이 설치되면 @WebSocketGateway 데코레이터로 변경
 */
@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);
  private server: any;
  private connectedClients = new Map<string, SocketWithAuth>();

  constructor(
    private readonly notificationService: NotificationService
  ) {}

  /**
   * 서버 인스턴스 설정
   */
  setServer(server: any): void {
    this.server = server;
  }

  /**
   * 클라이언트 연결 시 호출
   */
  async handleConnection(client: SocketWithAuth): Promise<void> {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);

      // 연결 시 인증 정보 추출 (쿼리 파라미터에서)
      const { ownerId, restaurantId } = client.handshake.query;

      if (!ownerId || !restaurantId) {
        this.logger.warn(`Connection rejected - Missing credentials: ${client.id}`);
        client.emit('error', {
          message: '점주 ID와 매장 ID가 필요합니다.',
          code: 'MISSING_CREDENTIALS'
        });
        client.disconnect(true);
        return;
      }

      // 클라이언트 정보 설정
      client.ownerId = ownerId as string;
      client.restaurantId = restaurantId as string;
      client.clientId = `${ownerId}_${restaurantId}_${client.id}`;

      // 연결된 클라이언트 목록에 추가
      this.connectedClients.set(client.clientId, client);

      // 알림 서비스에 클라이언트 등록
      this.notificationService.addClient(
        client.clientId,
        client.ownerId,
        client.restaurantId,
        client
      );

      // 연결 성공 응답 전송
      const connectionStatus: ConnectionStatusDto = {
        status: 'connected',
        timestamp: new Date().toISOString(),
        message: `점주용 실시간 알림 서비스에 연결되었습니다. (Restaurant: ${restaurantId})`
      };

      client.emit('connection_status', connectionStatus);

      this.logger.log(`Client connected successfully: ${client.clientId}`);

      // 해당 매장 룸에 조인 (실제 Socket.IO에서 구현)
      if (client.join) {
        await client.join(`restaurant_${restaurantId}`);
      }

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.emit('error', {
        message: '연결 중 오류가 발생했습니다.',
        code: 'CONNECTION_ERROR'
      });
      client.disconnect(true);
    }
  }

  /**
   * 클라이언트 연결 해제 시 호출
   */
  handleDisconnect(client: SocketWithAuth): void {
    try {
      if (client.clientId) {
        this.connectedClients.delete(client.clientId);
        this.notificationService.removeClient(client.clientId);
        this.logger.log(`Client disconnected: ${client.clientId}`);
      } else {
        this.logger.log(`Anonymous client disconnected: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error for client ${client.id}:`, error);
    }
  }

  /**
   * 알림 구독 설정
   */
  async handleSubscription(client: SocketWithAuth, subscribeDto: SubscribeNotificationDto): Promise<void> {
    try {
      if (!client.clientId) {
        throw new Error('클라이언트가 인증되지 않았습니다.');
      }

      // 구독 타입이 제공되지 않은 경우 모든 타입 구독
      const typesToSubscribe = subscribeDto.types || Object.values(NotificationType);

      this.notificationService.updateClientSubscription(client.clientId, typesToSubscribe);

      client.emit('subscription_updated', {
        subscribedTypes: typesToSubscribe,
        timestamp: new Date().toISOString(),
        message: '알림 구독이 업데이트되었습니다.'
      });

      this.logger.log(`Updated subscription for client ${client.clientId}: ${typesToSubscribe.join(', ')}`);

    } catch (error) {
      this.logger.error(`Subscription error for client ${client.id}:`, error);
      client.emit('error', {
        message: '구독 설정 중 오류가 발생했습니다.',
        code: 'SUBSCRIPTION_ERROR'
      });
    }
  }

  /**
   * 알림 히스토리 요청
   */
  async handleGetHistory(client: SocketWithAuth, data: { limit?: number }): Promise<void> {
    try {
      if (!client.ownerId) {
        throw new Error('클라이언트가 인증되지 않았습니다.');
      }

      const limit = data?.limit || 20;
      const history = this.notificationService.getNotificationHistory(client.ownerId, limit);

      client.emit('notification_history', {
        notifications: history,
        count: history.length,
        timestamp: new Date().toISOString()
      });

      this.logger.log(`Sent notification history to client ${client.clientId}: ${history.length} items`);

    } catch (error) {
      this.logger.error(`History request error for client ${client.id}:`, error);
      client.emit('error', {
        message: '알림 히스토리 조회 중 오류가 발생했습니다.',
        code: 'HISTORY_ERROR'
      });
    }
  }

  /**
   * 연결 상태 확인 (Ping)
   */
  handlePing(client: SocketWithAuth): void {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      clientId: client.clientId || client.id
    });
  }

  /**
   * 연결된 클라이언트 수 조회
   */
  async handleGetStats(client: SocketWithAuth): Promise<void> {
    try {
      if (!client.restaurantId) {
        throw new Error('클라이언트가 인증되지 않았습니다.');
      }

      const totalClients = this.notificationService.getConnectedClientsCount();
      const restaurantClients = this.notificationService.getRestaurantClientsCount(client.restaurantId);

      client.emit('connection_stats', {
        totalConnectedClients: totalClients,
        restaurantConnectedClients: restaurantClients,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Stats request error for client ${client.id}:`, error);
      client.emit('error', {
        message: '연결 통계 조회 중 오류가 발생했습니다.',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * 특정 매장에 알림 브로드캐스트 (내부 메서드)
   */
  async broadcastToRestaurant(restaurantId: string, notification: any): Promise<void> {
    try {
      // 해당 매장의 모든 연결된 클라이언트에게 전송
      const restaurantClients = Array.from(this.connectedClients.values())
        .filter(client => client.restaurantId === restaurantId);

      for (const client of restaurantClients) {
        client.emit('notification', notification);
      }

      this.logger.log(`Broadcasted notification to ${restaurantClients.length} clients for restaurant ${restaurantId}`);
    } catch (error) {
      this.logger.error(`Broadcast error for restaurant ${restaurantId}:`, error);
    }
  }

  /**
   * 모든 연결된 클라이언트에게 시스템 공지 브로드캐스트
   */
  async broadcastSystemNotice(notice: any): Promise<void> {
    try {
      const allClients = Array.from(this.connectedClients.values());
      
      for (const client of allClients) {
        client.emit('system_notice', notice);
      }

      this.logger.log(`Broadcasted system notice to ${allClients.length} clients`);
    } catch (error) {
      this.logger.error('System notice broadcast error:', error);
    }
  }

  /**
   * 서버 상태 확인 (헬스체크용)
   */
  getServerStatus(): {
    connectedClients: number;
    uptime: number;
    timestamp: string;
  } {
    return {
      connectedClients: this.connectedClients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 특정 클라이언트 조회
   */
  getClient(clientId: string): SocketWithAuth | undefined {
    return this.connectedClients.get(clientId);
  }

  /**
   * 매장별 연결된 클라이언트 목록 조회
   */
  getRestaurantClients(restaurantId: string): SocketWithAuth[] {
    return Array.from(this.connectedClients.values())
      .filter(client => client.restaurantId === restaurantId);
  }
} 