/**
 * 실시간 주문 상태 추적 게이트웨이
 * 
 * Socket.io를 사용하여 고객, 점주, 배달기사 간의 실시간 통신을 관리합니다.
 */

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * 클라이언트 연결 정보 인터페이스
 */
interface ClientInfo {
  userId: string;
  userType: 'customer' | 'owner' | 'driver' | 'admin';
  rooms: string[];
  connectedAt: Date;
}

/**
 * 소켓 이벤트 데이터 타입들
 */
interface JoinRoomData {
  userId: string;
  userType: 'customer' | 'owner' | 'driver' | 'admin';
  roomId: string;
}

interface OrderStatusUpdateData {
  orderId: string;
  status: string;
  message?: string;
  metadata?: any;
}

/**
 * 실시간 주문 상태 추적 게이트웨이 클래스
 */
@WebSocketGateway({
  port: 3001,
  cors: {
    origin: [
      'http://localhost:3000',  // Next.js 웹앱
      'http://localhost:8081',  // Expo 모바일앱
      'http://localhost:19006', // Expo 웹 모드
    ],
    credentials: true,
  },
  namespace: '/order-tracking',
})
export class OrderTrackingGateway 
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  private readonly logger = new Logger(OrderTrackingGateway.name);
  
  @WebSocketServer()
  server: Server;

  // 연결된 클라이언트 정보 저장
  private connectedClients: Map<string, ClientInfo> = new Map();

  /**
   * 게이트웨이 초기화
   */
  afterInit(server: Server) {
    this.logger.log('Order Tracking WebSocket Gateway initialized');
    
    // 서버 설정
    server.engine.generateId = () => {
      return `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };
  }

  /**
   * 클라이언트 연결 처리
   */
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // 연결 정보 기본 설정
    this.connectedClients.set(client.id, {
      userId: '',
      userType: 'customer',
      rooms: [],
      connectedAt: new Date(),
    });

    // 연결 확인 메시지 전송
    client.emit('connected', {
      message: 'Successfully connected to Order Tracking service',
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (clientInfo) {
      this.logger.log(
        `Client disconnected: ${client.id} (User: ${clientInfo.userId}, Type: ${clientInfo.userType})`
      );
      
      // 모든 룸에서 제거
      clientInfo.rooms.forEach(room => {
        client.leave(room);
      });
      
      // 클라이언트 정보 삭제
      this.connectedClients.delete(client.id);
    } else {
      this.logger.log(`Unknown client disconnected: ${client.id}`);
    }
  }

  /**
   * 룸 참여 처리
   */
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData
  ) {
    try {
      this.logger.log(`Client ${client.id} joining room: ${data.roomId}`);
      
      // 클라이언트 정보 업데이트
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.userId = data.userId;
        clientInfo.userType = data.userType;
        clientInfo.rooms.push(data.roomId);
      }
      
      // 룸 참여
      client.join(data.roomId);
      
      // 참여 확인 메시지
      client.emit('room-joined', {
        roomId: data.roomId,
        message: `Successfully joined room: ${data.roomId}`,
        userType: data.userType,
        timestamp: new Date().toISOString(),
      });
      
      // 룸의 다른 멤버들에게 새 참여자 알림
      client.to(data.roomId).emit('user-joined', {
        userId: data.userId,
        userType: data.userType,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(
        `User ${data.userId} (${data.userType}) joined room ${data.roomId}`
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error joining room: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to join room',
        error: errorMessage,
      });
    }
  }

  /**
   * 룸 나가기 처리
   */
  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      this.logger.log(`Client ${client.id} leaving room: ${data.roomId}`);
      
      // 클라이언트 정보에서 룸 제거
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.rooms = clientInfo.rooms.filter(room => room !== data.roomId);
      }
      
      // 룸 나가기
      client.leave(data.roomId);
      
      // 나가기 확인 메시지
      client.emit('room-left', {
        roomId: data.roomId,
        message: `Successfully left room: ${data.roomId}`,
        timestamp: new Date().toISOString(),
      });
      
      // 룸의 다른 멤버들에게 알림
      client.to(data.roomId).emit('user-left', {
        userId: clientInfo?.userId,
        userType: clientInfo?.userType,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error leaving room: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to leave room',
        error: errorMessage,
      });
    }
  }

  /**
   * 주문 상태 업데이트 브로드캐스트
   */
  broadcastOrderStatusUpdate(data: OrderStatusUpdateData) {
    try {
      const roomId = `order-${data.orderId}`;
      
      this.logger.log(
        `Broadcasting order status update to room ${roomId}: ${data.status}`
      );
      
      // 해당 주문 룸의 모든 참여자에게 브로드캐스트
      this.server.to(roomId).emit('order-status-update', {
        orderId: data.orderId,
        status: data.status,
        message: data.message,
        metadata: data.metadata,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error broadcasting order status: ${errorMessage}`);
    }
  }

  /**
   * 배달기사 위치 업데이트 브로드캐스트
   */
  broadcastDriverLocationUpdate(data: {
    orderId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    status: string;
  }) {
    try {
      const roomId = `order-${data.orderId}`;
      
      this.logger.log(
        `Broadcasting driver location update to room ${roomId}`
      );
      
      // 해당 주문 룸의 고객과 점주에게만 브로드캐스트
      this.server.to(roomId).emit('driver-location-update', {
        orderId: data.orderId,
        driverId: data.driverId,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        status: data.status,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error broadcasting driver location: ${errorMessage}`);
    }
  }

  /**
   * 특정 사용자에게 개인 메시지 전송
   */
  sendPersonalMessage(userId: string, event: string, data: any) {
    try {
      // 해당 사용자의 모든 소켓을 찾아서 메시지 전송
      for (const [socketId, clientInfo] of this.connectedClients.entries()) {
        if (clientInfo.userId === userId) {
          this.server.to(socketId).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
          });
          
          this.logger.log(`Personal message sent to user ${userId}: ${event}`);
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error sending personal message: ${errorMessage}`);
    }
  }

  /**
   * 관리자에게 알림 브로드캐스트
   */
  broadcastToAdmins(event: string, data: any) {
    try {
      // 모든 관리자 클라이언트에게 브로드캐스트
      for (const [socketId, clientInfo] of this.connectedClients.entries()) {
        if (clientInfo.userType === 'admin') {
          this.server.to(socketId).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      this.logger.log(`Admin broadcast sent: ${event}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error broadcasting to admins: ${errorMessage}`);
    }
  }

  /**
   * 연결된 클라이언트 통계 조회
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      userTypes: {
        customer: 0,
        owner: 0,
        driver: 0,
        admin: 0,
      },
      rooms: new Set<string>(),
    };

    for (const clientInfo of this.connectedClients.values()) {
      stats.userTypes[clientInfo.userType]++;
      clientInfo.rooms.forEach(room => stats.rooms.add(room));
    }

    return {
      ...stats,
      activeRooms: stats.rooms.size,
      rooms: Array.from(stats.rooms),
    };
  }

  /**
   * 핑-퐁 헬스체크
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
    });
  }
} 