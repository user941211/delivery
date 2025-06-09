/**
 * 채팅 게이트웨이
 * 
 * Socket.io를 사용하여 실시간 채팅 기능을 제공합니다.
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
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/message.service';
import { ChatRoomService } from '../services/chat-room.service';

import {
  SendMessageDto,
  MarkMessageAsReadDto,
  MessageResponseDto,
  ParticipantRole
} from '../dto';

/**
 * 연결된 클라이언트 정보 인터페이스
 */
interface ChatClientInfo {
  userId: string;
  userName: string;
  userRole: ParticipantRole;
  chatRooms: string[];
  connectedAt: Date;
  lastActivity: Date;
  isTyping: boolean;
  typingRoom?: string;
}

/**
 * 채팅방 입장 데이터 인터페이스
 */
interface JoinChatRoomData {
  userId: string;
  userName: string;
  userRole: ParticipantRole;
  chatRoomId: string;
}

/**
 * 메시지 전송 데이터 인터페이스
 */
interface SendChatMessageData extends SendMessageDto {
  tempId?: string; // 클라이언트 임시 ID
}

/**
 * 타이핑 상태 데이터 인터페이스
 */
interface TypingStatusData {
  chatRoomId: string;
  isTyping: boolean;
}

/**
 * 온라인 상태 데이터 인터페이스
 */
interface OnlineStatusData {
  chatRoomId: string;
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

/**
 * 채팅 게이트웨이 클래스
 */
@WebSocketGateway({
  port: 3002,
  cors: {
    origin: [
      'http://localhost:3000',  // Next.js 웹앱
      'http://localhost:8081',  // Expo 모바일앱
      'http://localhost:19006', // Expo 웹 모드
    ],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  private readonly logger = new Logger(ChatGateway.name);
  
  @WebSocketServer()
  server: Server;

  // 연결된 클라이언트 정보 저장
  private connectedClients: Map<string, ChatClientInfo> = new Map();
  
  // 채팅방별 온라인 사용자 추적
  private roomOnlineUsers: Map<string, Set<string>> = new Map();
  
  // 타이핑 상태 관리
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => ChatRoomService))
    private readonly chatRoomService: ChatRoomService
  ) {}

  /**
   * 게이트웨이 초기화
   */
  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
    
    // 서버 설정
    server.engine.generateId = () => {
      return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };
  }

  /**
   * 클라이언트 연결 처리
   */
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Chat client connected: ${client.id}`);
    
    // 연결 확인 메시지 전송
    client.emit('chat:connected', {
      message: 'Successfully connected to Chat service',
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
        `Chat client disconnected: ${client.id} (User: ${clientInfo.userId})`
      );
      
      // 모든 채팅방에서 오프라인 상태 브로드캐스트
      clientInfo.chatRooms.forEach(roomId => {
        this.updateUserOnlineStatus(roomId, clientInfo.userId, false);
        client.leave(roomId);
      });
      
      // 타이핑 상태 정리
      if (clientInfo.isTyping && clientInfo.typingRoom) {
        this.broadcastTypingStatus(clientInfo.typingRoom, clientInfo.userId, false, clientInfo.userName);
      }
      
      // 클라이언트 정보 삭제
      this.connectedClients.delete(client.id);
    }
  }

  /**
   * 채팅방 입장 처리
   */
  @SubscribeMessage('chat:join-room')
  async handleJoinChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinChatRoomData
  ) {
    try {
      this.logger.log(`User ${data.userId} joining chat room: ${data.chatRoomId}`);
      
      // 채팅방 참가자 권한 확인 (MessageService를 통해)
      await this.validateChatRoomAccess(data.chatRoomId, data.userId);
      
      // 클라이언트 정보 설정/업데이트
      let clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        clientInfo = {
          userId: data.userId,
          userName: data.userName,
          userRole: data.userRole,
          chatRooms: [],
          connectedAt: new Date(),
          lastActivity: new Date(),
          isTyping: false
        };
        this.connectedClients.set(client.id, clientInfo);
      }
      
      // 채팅방 목록에 추가
      if (!clientInfo.chatRooms.includes(data.chatRoomId)) {
        clientInfo.chatRooms.push(data.chatRoomId);
      }
      
      // Socket.io 룸 참여
      client.join(data.chatRoomId);
      
      // 온라인 상태 업데이트
      this.updateUserOnlineStatus(data.chatRoomId, data.userId, true);
      
      // 참여 확인 메시지
      client.emit('chat:room-joined', {
        chatRoomId: data.chatRoomId,
        message: `Successfully joined chat room: ${data.chatRoomId}`,
        onlineUsers: Array.from(this.roomOnlineUsers.get(data.chatRoomId) || []),
        timestamp: new Date().toISOString(),
      });
      
      // 다른 참가자들에게 새 사용자 입장 알림
      client.to(data.chatRoomId).emit('chat:user-joined', {
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        chatRoomId: data.chatRoomId,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`User ${data.userId} joined chat room ${data.chatRoomId}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error joining chat room: ${errorMessage}`);
      client.emit('chat:error', {
        message: 'Failed to join chat room',
        error: errorMessage,
      });
    }
  }

  /**
   * 채팅방 나가기 처리
   */
  @SubscribeMessage('chat:leave-room')
  handleLeaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string }
  ) {
    try {
      this.logger.log(`Client ${client.id} leaving chat room: ${data.chatRoomId}`);
      
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        // 채팅방 목록에서 제거
        clientInfo.chatRooms = clientInfo.chatRooms.filter(room => room !== data.chatRoomId);
        
        // Socket.io 룸 나가기
        client.leave(data.chatRoomId);
        
        // 온라인 상태 업데이트
        this.updateUserOnlineStatus(data.chatRoomId, clientInfo.userId, false);
        
        // 타이핑 상태 정리
        if (clientInfo.isTyping && clientInfo.typingRoom === data.chatRoomId) {
          this.broadcastTypingStatus(data.chatRoomId, clientInfo.userId, false, clientInfo.userName);
          clientInfo.isTyping = false;
          clientInfo.typingRoom = undefined;
        }
        
        // 나가기 확인 메시지
        client.emit('chat:room-left', {
          chatRoomId: data.chatRoomId,
          message: `Successfully left chat room: ${data.chatRoomId}`,
          timestamp: new Date().toISOString(),
        });
        
        // 다른 참가자들에게 사용자 퇴장 알림
        client.to(data.chatRoomId).emit('chat:user-left', {
          userId: clientInfo.userId,
          userName: clientInfo.userName,
          chatRoomId: data.chatRoomId,
          timestamp: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error leaving chat room: ${errorMessage}`);
      client.emit('chat:error', {
        message: 'Failed to leave chat room',
        error: errorMessage,
      });
    }
  }

  /**
   * 메시지 전송 처리
   */
  @SubscribeMessage('chat:send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendChatMessageData
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        throw new Error('Client not authenticated');
      }
      
      this.logger.log(`Sending message from ${clientInfo.userId} to room ${data.chatRoomId}`);
      
      // 타이핑 상태 정리
      if (clientInfo.isTyping && clientInfo.typingRoom === data.chatRoomId) {
        this.broadcastTypingStatus(data.chatRoomId, clientInfo.userId, false, clientInfo.userName);
        clientInfo.isTyping = false;
        clientInfo.typingRoom = undefined;
      }
      
      // MessageService를 통해 메시지 저장
      const result = await this.messageService.sendMessage(clientInfo.userId, data);
      
      // 클라이언트에게 전송 확인
      client.emit('chat:message-sent', {
        tempId: data.tempId,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
      
      // 채팅방의 다른 참가자들에게 새 메시지 브로드캐스트
      client.to(data.chatRoomId).emit('chat:new-message', {
        message: result.message,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Message sent successfully: ${result.message.id}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error sending message: ${errorMessage}`);
      client.emit('chat:message-error', {
        tempId: data.tempId,
        message: 'Failed to send message',
        error: errorMessage,
      });
    }
  }

  /**
   * 메시지 읽음 처리
   */
  @SubscribeMessage('chat:mark-read')
  async handleMarkMessagesAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkMessageAsReadDto
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        throw new Error('Client not authenticated');
      }
      
      // MessageService를 통해 읽음 처리
      await this.messageService.markMessagesAsRead(clientInfo.userId, data);
      
      // 읽음 확인
      client.emit('chat:messages-marked-read', {
        chatRoomId: data.chatRoomId,
        messageIds: data.messageIds,
        timestamp: new Date().toISOString(),
      });
      
      // 다른 참가자들에게 읽음 상태 브로드캐스트
      client.to(data.chatRoomId).emit('chat:messages-read', {
        userId: clientInfo.userId,
        userName: clientInfo.userName,
        chatRoomId: data.chatRoomId,
        messageIds: data.messageIds,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error marking messages as read: ${errorMessage}`);
      client.emit('chat:error', {
        message: 'Failed to mark messages as read',
        error: errorMessage,
      });
    }
  }

  /**
   * 타이핑 상태 처리
   */
  @SubscribeMessage('chat:typing')
  handleTypingStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingStatusData
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return;
      }
      
      // 타이핑 상태 업데이트
      clientInfo.isTyping = data.isTyping;
      clientInfo.typingRoom = data.isTyping ? data.chatRoomId : undefined;
      clientInfo.lastActivity = new Date();
      
      // 다른 참가자들에게 타이핑 상태 브로드캐스트
      this.broadcastTypingStatus(data.chatRoomId, clientInfo.userId, data.isTyping, clientInfo.userName);
      
      // 타이핑 상태 자동 해제 타이머 설정
      if (data.isTyping) {
        const timerKey = `${clientInfo.userId}_${data.chatRoomId}`;
        
        // 기존 타이머 정리
        if (this.typingTimers.has(timerKey)) {
          clearTimeout(this.typingTimers.get(timerKey));
        }
        
        // 3초 후 자동으로 타이핑 상태 해제
        const timer = setTimeout(() => {
          if (clientInfo.isTyping && clientInfo.typingRoom === data.chatRoomId) {
            clientInfo.isTyping = false;
            clientInfo.typingRoom = undefined;
            this.broadcastTypingStatus(data.chatRoomId, clientInfo.userId, false, clientInfo.userName);
          }
          this.typingTimers.delete(timerKey);
        }, 3000);
        
        this.typingTimers.set(timerKey, timer);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error handling typing status: ${errorMessage}`);
    }
  }

  /**
   * 온라인 상태 조회
   */
  @SubscribeMessage('chat:get-online-users')
  handleGetOnlineUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string }
  ) {
    try {
      const onlineUsers = Array.from(this.roomOnlineUsers.get(data.chatRoomId) || []);
      
      client.emit('chat:online-users', {
        chatRoomId: data.chatRoomId,
        onlineUsers,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error getting online users: ${errorMessage}`);
      client.emit('chat:error', {
        message: 'Failed to get online users',
        error: errorMessage,
      });
    }
  }

  /**
   * 핑-퐁 헬스체크
   */
  @SubscribeMessage('chat:ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
    
    client.emit('chat:pong', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 내부 메서드들
   */

  /**
   * 채팅방 접근 권한 확인
   */
  private async validateChatRoomAccess(chatRoomId: string, userId: string): Promise<void> {
    try {
      // MessageService의 validateParticipantAccess를 활용
      // 직접 호출할 수 없으므로 우회 방법 사용
      await this.messageService.getUnreadMessageCount(chatRoomId, userId);
    } catch (error) {
      throw new Error('채팅방에 접근할 권한이 없습니다.');
    }
  }

  /**
   * 사용자 온라인 상태 업데이트
   */
  private updateUserOnlineStatus(chatRoomId: string, userId: string, isOnline: boolean): void {
    if (!this.roomOnlineUsers.has(chatRoomId)) {
      this.roomOnlineUsers.set(chatRoomId, new Set());
    }
    
    const onlineUsers = this.roomOnlineUsers.get(chatRoomId)!;
    
    if (isOnline) {
      onlineUsers.add(userId);
    } else {
      onlineUsers.delete(userId);
    }
    
    // 다른 참가자들에게 온라인 상태 변경 브로드캐스트
    this.server.to(chatRoomId).emit('chat:user-online-status', {
      userId,
      isOnline,
      chatRoomId,
      onlineUsers: Array.from(onlineUsers),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 타이핑 상태 브로드캐스트
   */
  private broadcastTypingStatus(
    chatRoomId: string,
    userId: string,
    isTyping: boolean,
    userName: string
  ): void {
    this.server.to(chatRoomId).emit('chat:typing-status', {
      userId,
      userName,
      isTyping,
      chatRoomId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 연결 통계 조회
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      userRoles: {
        customer: 0,
        owner: 0,
        driver: 0,
        admin: 0,
      },
      activeChatRooms: this.roomOnlineUsers.size,
      totalOnlineUsers: 0,
    };

    for (const clientInfo of this.connectedClients.values()) {
      stats.userRoles[clientInfo.userRole]++;
    }

    for (const onlineUsers of this.roomOnlineUsers.values()) {
      stats.totalOnlineUsers += onlineUsers.size;
    }

    return stats;
  }

  /**
   * 특정 채팅방에 메시지 브로드캐스트 (외부에서 호출용)
   */
  broadcastMessageToRoom(chatRoomId: string, event: string, data: any): void {
    this.server.to(chatRoomId).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 특정 사용자에게 메시지 전송 (외부에서 호출용)
   */
  sendMessageToUser(userId: string, event: string, data: any): void {
    for (const [socketId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.userId === userId) {
        this.server.to(socketId).emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
} 