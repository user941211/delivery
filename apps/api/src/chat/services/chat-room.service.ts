/**
 * 채팅룸 관리 서비스
 * 
 * 채팅방 생성, 참가자 관리, 설정 관리를 담당합니다.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeNotificationService } from '../../realtime/services/realtime-notification.service';
import { NotificationPriority, UserType } from '../../realtime/dto/realtime-events.dto';
import { PaginatedResult } from '../interfaces/common.interface';

import {
  CreateChatRoomDto,
  UpdateChatRoomDto,
  AddParticipantDto,
  GetChatRoomsQueryDto,
  ChatRoomResponseDto,
  ParticipantResponseDto,
  ChatStatsDto,
  ChatRoomType,
  ChatRoomStatus,
  ParticipantRole,
  ChatRoomSettingsDto
} from '../dto';

import {
  ChatRoomEntity,
  ChatParticipantEntity,
  ChatRoomSettingsEntity,
  ChatDatabase,
  PaginatedChatResult,
  ChatAnalytics
} from '../entities';

/**
 * 채팅룸 관리 서비스 클래스
 */
@Injectable()
export class ChatRoomService {
  private readonly logger = new Logger(ChatRoomService.name);
  private readonly supabase: SupabaseClient<ChatDatabase>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RealtimeNotificationService))
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient<ChatDatabase>(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 채팅방 생성
   */
  async createChatRoom(userId: string, createData: CreateChatRoomDto): Promise<ChatRoomResponseDto> {
    try {
      this.logger.log(`Creating chat room for user: ${userId}`);

      // 중복 채팅방 확인 (주문 기반 채팅방인 경우)
      if (createData.orderId) {
        const { data: existingRoom } = await this.supabase
          .from('chat_rooms')
          .select('id')
          .eq('order_id', createData.orderId)
          .eq('type', createData.type)
          .single();

        if (existingRoom) {
          throw new BadRequestException('해당 주문에 대한 채팅방이 이미 존재합니다.');
        }
      }

      const now = new Date().toISOString();

      // 채팅방 제목 자동 생성
      const title = createData.title || this.generateChatRoomTitle(createData.type, createData.orderId);

      // 채팅방 생성
      const { data: chatRoom, error } = await this.supabase
        .from('chat_rooms')
        .insert({
          type: createData.type,
          title,
          status: ChatRoomStatus.ACTIVE,
          order_id: createData.orderId,
          restaurant_id: createData.restaurantId,
          created_by: userId,
          participant_count: createData.participantIds.length + 1, // 생성자 포함
          metadata: createData.metadata,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw error;

      // 생성자를 참가자로 추가
      await this.addParticipantInternal(chatRoom.id, userId, this.getUserRole(userId), true);

      // 다른 참가자들 추가
      for (const participantId of createData.participantIds) {
        if (participantId !== userId) {
          await this.addParticipantInternal(
            chatRoom.id, 
            participantId, 
            this.getUserRole(participantId),
            false
          );
        }
      }

      // 초기 메시지 전송 (선택적)
      if (createData.initialMessage) {
        // MessageService가 구현되면 여기서 초기 메시지 전송
        // await this.messageService.sendSystemMessage(chatRoom.id, createData.initialMessage);
      }

      // 참가자들에게 채팅방 생성 알림
      await this.notifyParticipantsAboutRoomCreation(chatRoom, createData.participantIds);

      this.logger.log(`Chat room created: ${chatRoom.id}`);
      return this.mapToResponseDto(chatRoom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create chat room: ${errorMessage}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('채팅방 생성에 실패했습니다.');
    }
  }

  /**
   * 채팅방 조회 (단일)
   */
  async getChatRoom(roomId: string, userId: string): Promise<ChatRoomResponseDto> {
    try {
      // 참가자 권한 확인
      await this.validateParticipantAccess(roomId, userId);

      const { data: chatRoom, error } = await this.supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('채팅방을 찾을 수 없습니다.');
        }
        throw error;
      }

      // 읽지 않은 메시지 수 계산
      const unreadCount = await this.getUnreadMessageCount(roomId, userId);

      const response = this.mapToResponseDto(chatRoom);
      response.unreadCount = unreadCount;

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get chat room: ${errorMessage}`);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('채팅방 조회에 실패했습니다.');
    }
  }

  /**
   * 채팅방 목록 조회 (페이지네이션)
   */
  async getChatRooms(userId: string, query: GetChatRoomsQueryDto): Promise<PaginatedResult<ChatRoomResponseDto>> {
    try {
      this.logger.log(`Fetching chat rooms for user: ${userId}`);

      // 사용자가 참가한 채팅방 ID 조회
      const { data: participantRooms, error: participantError } = await this.supabase
        .from('chat_participants')
        .select('chat_room_id')
        .eq('user_id', userId)
        .is('left_at', null); // 아직 나가지 않은 채팅방만

      if (participantError) throw participantError;

      const roomIds = participantRooms.map(p => p.chat_room_id);

      if (roomIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: query.page,
          limit: query.limit,
          totalPages: 0
        };
      }

      let queryBuilder = this.supabase
        .from('chat_rooms')
        .select('*', { count: 'exact' })
        .in('id', roomIds);

      // 필터 적용
      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type);
      }

      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status);
      }

      if (query.orderId) {
        queryBuilder = queryBuilder.eq('order_id', query.orderId);
      }

      if (query.search) {
        queryBuilder = queryBuilder.ilike('title', `%${query.search}%`);
      }

      // 페이지네이션
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('last_message_time', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / query.limit);

      // 각 채팅방의 읽지 않은 메시지 수 조회
      const chatRoomsWithUnread = await Promise.all(
        (data || []).map(async (room) => {
          const unreadCount = await this.getUnreadMessageCount(room.id, userId);
          const response = this.mapToResponseDto(room);
          response.unreadCount = unreadCount;
          return response;
        })
      );

      return {
        data: chatRoomsWithUnread,
        total: count || 0,
        page: query.page,
        limit: query.limit,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get chat rooms: ${errorMessage}`);
      throw new BadRequestException('채팅방 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 채팅방 업데이트
   */
  async updateChatRoom(roomId: string, userId: string, updateData: UpdateChatRoomDto): Promise<ChatRoomResponseDto> {
    try {
      this.logger.log(`Updating chat room: ${roomId}`);

      // 권한 확인 (관리자 또는 생성자만 수정 가능)
      await this.validateAdminAccess(roomId, userId);

      const { data: chatRoom, error } = await this.supabase
        .from('chat_rooms')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('채팅방을 찾을 수 없습니다.');
        }
        throw error;
      }

      // 참가자들에게 변경 알림
      await this.notifyParticipantsAboutRoomUpdate(chatRoom);

      this.logger.log(`Chat room updated: ${roomId}`);
      return this.mapToResponseDto(chatRoom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update chat room: ${errorMessage}`);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('채팅방 업데이트에 실패했습니다.');
    }
  }

  /**
   * 참가자 추가
   */
  async addParticipant(addData: AddParticipantDto, requestUserId: string): Promise<ParticipantResponseDto> {
    try {
      this.logger.log(`Adding participant ${addData.userId} to room ${addData.chatRoomId}`);

      // 권한 확인
      await this.validateAdminAccess(addData.chatRoomId, requestUserId);

      // 중복 참가 확인
      const { data: existingParticipant } = await this.supabase
        .from('chat_participants')
        .select('id')
        .eq('chat_room_id', addData.chatRoomId)
        .eq('user_id', addData.userId)
        .is('left_at', null)
        .single();

      if (existingParticipant) {
        throw new BadRequestException('이미 채팅방에 참가한 사용자입니다.');
      }

      const participant = await this.addParticipantInternal(
        addData.chatRoomId,
        addData.userId,
        addData.role,
        false
      );

      // 참가자 수 업데이트
      await this.updateParticipantCount(addData.chatRoomId);

      // 참가자들에게 알림
      await this.notifyParticipantsAboutNewMember(addData.chatRoomId, addData.userId, addData.inviteMessage);

      return this.mapParticipantToResponseDto(participant);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to add participant: ${errorMessage}`);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('참가자 추가에 실패했습니다.');
    }
  }

  /**
   * 참가자 제거 (나가기)
   */
  async removeParticipant(roomId: string, userId: string, requestUserId: string): Promise<void> {
    try {
      this.logger.log(`Removing participant ${userId} from room ${roomId}`);

      // 본인이거나 관리자 권한 확인
      if (userId !== requestUserId) {
        await this.validateAdminAccess(roomId, requestUserId);
      }

      const { data: participant, error } = await this.supabase
        .from('chat_participants')
        .update({
          left_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('chat_room_id', roomId)
        .eq('user_id', userId)
        .is('left_at', null)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('참가자를 찾을 수 없습니다.');
        }
        throw error;
      }

      // 참가자 수 업데이트
      await this.updateParticipantCount(roomId);

      // 참가자들에게 알림
      await this.notifyParticipantsAboutMemberLeft(roomId, userId);

      this.logger.log(`Participant removed: ${userId} from room ${roomId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to remove participant: ${errorMessage}`);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('참가자 제거에 실패했습니다.');
    }
  }

  /**
   * 채팅방 참가자 목록 조회
   */
  async getChatRoomParticipants(roomId: string, userId: string): Promise<ParticipantResponseDto[]> {
    try {
      // 참가자 권한 확인
      await this.validateParticipantAccess(roomId, userId);

      const { data: participants, error } = await this.supabase
        .from('chat_participants')
        .select(`
          *,
          users:user_id (
            id,
            name,
            profile
          )
        `)
        .eq('chat_room_id', roomId)
        .is('left_at', null)
        .order('joined_at');

      if (error) throw error;

      return participants.map(p => this.mapParticipantToResponseDto(p));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get chat room participants: ${errorMessage}`);
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException('참가자 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 채팅방 설정 관리
   */
  async updateChatRoomSettings(
    roomId: string, 
    userId: string, 
    settings: ChatRoomSettingsDto
  ): Promise<ChatRoomSettingsEntity> {
    try {
      // 참가자 권한 확인
      await this.validateParticipantAccess(roomId, userId);

      const { data, error } = await this.supabase
        .from('chat_room_settings')
        .upsert({
          chat_room_id: roomId,
          user_id: userId,
          notifications_enabled: settings.notificationsEnabled ?? true,
          auto_reply_enabled: !!settings.autoReplyMessage,
          auto_reply_message: settings.autoReplyMessage,
          quick_reply_options: settings.quickReplyOptions,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update chat room settings: ${errorMessage}`);
      throw new BadRequestException('채팅방 설정 업데이트에 실패했습니다.');
    }
  }

  /**
   * 채팅 통계 조회
   */
  async getChatStats(userId: string): Promise<ChatStatsDto> {
    try {
      // 사용자 참가 채팅방들 조회
      const { data: participantRooms } = await this.supabase
        .from('chat_participants')
        .select('chat_room_id')
        .eq('user_id', userId)
        .is('left_at', null);

      const roomIds = participantRooms?.map(p => p.chat_room_id) || [];

      if (roomIds.length === 0) {
        return {
          totalChatRooms: 0,
          activeChatRooms: 0,
          totalMessages: 0,
          unreadMessages: 0,
          roomsByType: {} as Record<ChatRoomType, number>,
          dailyMessageCounts: []
        };
      }

      // 채팅방 통계
      const { data: rooms } = await this.supabase
        .from('chat_rooms')
        .select('type, status')
        .in('id', roomIds);

      // 메시지 통계 (구현 시 MessageService 필요)
      // const { data: messages } = await this.supabase
      //   .from('messages')
      //   .select('id')
      //   .in('chat_room_id', roomIds);

      const roomsByType = (rooms || []).reduce((acc, room) => {
        acc[room.type] = (acc[room.type] || 0) + 1;
        return acc;
      }, {} as Record<ChatRoomType, number>);

      const activeChatRooms = (rooms || []).filter(room => room.status === ChatRoomStatus.ACTIVE).length;

      return {
        totalChatRooms: roomIds.length,
        activeChatRooms,
        totalMessages: 0, // MessageService 구현 후 실제 값으로 대체
        unreadMessages: 0, // MessageService 구현 후 실제 값으로 대체
        roomsByType,
        dailyMessageCounts: [] // MessageService 구현 후 실제 값으로 대체
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get chat stats: ${errorMessage}`);
      throw new BadRequestException('채팅 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 내부 메서드: 참가자 추가
   */
  private async addParticipantInternal(
    roomId: string,
    userId: string,
    role: ParticipantRole,
    isCreator: boolean
  ): Promise<ChatParticipantEntity> {
    const now = new Date().toISOString();

    const { data: participant, error } = await this.supabase
      .from('chat_participants')
      .insert({
        chat_room_id: roomId,
        user_id: userId,
        role,
        last_active_at: now,
        joined_at: now,
        is_muted: false,
        notification_enabled: true,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) throw error;

    return participant;
  }

  /**
   * 참가자 권한 확인
   */
  private async validateParticipantAccess(roomId: string, userId: string): Promise<void> {
    const { data: participant } = await this.supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_room_id', roomId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (!participant) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }
  }

  /**
   * 관리자 권한 확인
   */
  private async validateAdminAccess(roomId: string, userId: string): Promise<void> {
    const { data: room } = await this.supabase
      .from('chat_rooms')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    // 생성자이거나 관리자 역할인 경우
    const { data: participant } = await this.supabase
      .from('chat_participants')
      .select('role')
      .eq('chat_room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (room.created_by !== userId && participant?.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  /**
   * 읽지 않은 메시지 수 조회 (임시 구현)
   */
  private async getUnreadMessageCount(roomId: string, userId: string): Promise<number> {
    try {
      // MessageService 구현 후 실제 로직으로 대체
      // 현재는 임시로 0 반환
      return 0;
    } catch (error) {
      this.logger.warn('Failed to get unread message count, returning 0');
      return 0;
    }
  }

  /**
   * 참가자 수 업데이트
   */
  private async updateParticipantCount(roomId: string): Promise<void> {
    const { count } = await this.supabase
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId)
      .is('left_at', null);

    await this.supabase
      .from('chat_rooms')
      .update({ 
        participant_count: count || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);
  }

  /**
   * 채팅방 제목 자동 생성
   */
  private generateChatRoomTitle(type: ChatRoomType, orderId?: string): string {
    switch (type) {
      case ChatRoomType.ORDER_SUPPORT:
        return `주문 문의 ${orderId ? `(${orderId.slice(-8)})` : ''}`;
      case ChatRoomType.DELIVERY_COORDINATION:
        return `배달 조정 ${orderId ? `(${orderId.slice(-8)})` : ''}`;
      case ChatRoomType.PICKUP_COORDINATION:
        return `픽업 조정 ${orderId ? `(${orderId.slice(-8)})` : ''}`;
      case ChatRoomType.CUSTOMER_SERVICE:
        return '고객 서비스';
      case ChatRoomType.GROUP_CHAT:
        return '그룹 채팅';
      default:
        return '채팅방';
    }
  }

  /**
   * 사용자 역할 추정 (임시 구현)
   */
  private getUserRole(userId: string): ParticipantRole {
    // 실제로는 사용자 정보를 조회해서 역할을 반환
    // 현재는 임시로 CUSTOMER 반환
    return ParticipantRole.CUSTOMER;
  }

  /**
   * 알림 메서드들
   */
  private async notifyParticipantsAboutRoomCreation(room: ChatRoomEntity, participantIds: string[]): Promise<void> {
    try {
      await this.realtimeNotificationService.sendNotification({
        title: '새 채팅방',
        message: `${room.title} 채팅방이 생성되었습니다.`,
        priority: NotificationPriority.MEDIUM,
        targets: participantIds.map(id => ({
          userId: id,
          userType: UserType.CUSTOMER // 실제로는 사용자 유형 조회 필요
        })),
        category: 'chat_room_created',
        metadata: { roomId: room.id, roomType: room.type }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send room creation notification: ${errorMessage}`);
    }
  }

  private async notifyParticipantsAboutRoomUpdate(room: ChatRoomEntity): Promise<void> {
    // 구현 생략
  }

  private async notifyParticipantsAboutNewMember(roomId: string, newUserId: string, inviteMessage?: string): Promise<void> {
    // 구현 생략
  }

  private async notifyParticipantsAboutMemberLeft(roomId: string, leftUserId: string): Promise<void> {
    // 구현 생략
  }

  /**
   * 매핑 메서드들
   */
  private mapToResponseDto(entity: ChatRoomEntity): ChatRoomResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      status: entity.status,
      participantCount: entity.participant_count,
      lastMessageContent: entity.last_message_content,
      lastMessageTime: entity.last_message_time ? new Date(entity.last_message_time) : undefined,
      unreadCount: 0, // 별도로 계산하여 설정
      orderId: entity.order_id,
      restaurantId: entity.restaurant_id,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      metadata: entity.metadata
    };
  }

  private mapParticipantToResponseDto(entity: any): ParticipantResponseDto {
    return {
      id: entity.id,
      chatRoomId: entity.chat_room_id,
      userId: entity.user_id,
      userName: entity.users?.name || 'Unknown',
      role: entity.role,
      lastReadMessageId: entity.last_read_message_id,
      lastActiveAt: new Date(entity.last_active_at),
      isOnline: false, // 실제로는 온라인 상태 확인 필요
      joinedAt: new Date(entity.joined_at),
      leftAt: entity.left_at ? new Date(entity.left_at) : undefined
    };
  }
} 