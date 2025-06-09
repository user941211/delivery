/**
 * 메시지 서비스
 * 
 * 채팅 메시지 전송, 수신, 읽음 상태 관리를 담당합니다.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeNotificationService } from '../../realtime/services/realtime-notification.service';
import { ChatRoomService } from './chat-room.service';
import { PaginatedResult } from '../interfaces/common.interface';

import {
  SendMessageDto,
  MarkMessageAsReadDto,
  GetMessagesQueryDto,
  MessageResponseDto,
  MessageType,
  MessageStatus,
  ParticipantRole
} from '../dto';

import {
  MessageEntity,
  MessageReadStatusEntity,
  ChatAttachmentEntity,
  ChatDatabase,
  PaginatedChatResult
} from '../entities';

/**
 * 메시지 전송 결과 인터페이스
 */
export interface MessageSendResult {
  message: MessageResponseDto;
  readByUsers: string[];
  notificationsSent: number;
}

/**
 * 메시지 서비스 클래스
 */
@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly supabase: SupabaseClient<ChatDatabase>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RealtimeNotificationService))
    private readonly realtimeNotificationService: RealtimeNotificationService,
    @Inject(forwardRef(() => ChatRoomService))
    private readonly chatRoomService: ChatRoomService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient<ChatDatabase>(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 메시지 전송
   */
  async sendMessage(userId: string, messageData: SendMessageDto): Promise<MessageSendResult> {
    try {
      this.logger.log(`Sending message from user ${userId} to room ${messageData.chatRoomId}`);

      // 채팅방 참가자 권한 확인
      await this.validateParticipantAccess(messageData.chatRoomId, userId);

      // 메시지 유효성 검증
      this.validateMessageContent(messageData);

      const now = new Date().toISOString();

      // 메시지 저장
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          chat_room_id: messageData.chatRoomId,
          sender_id: userId,
          type: messageData.type,
          content: messageData.content,
          attachment_url: messageData.attachmentUrl,
          attachment_name: messageData.attachmentName,
          attachment_size: messageData.attachmentSize,
          latitude: messageData.latitude,
          longitude: messageData.longitude,
          reply_to_message_id: messageData.replyToMessageId,
          status: MessageStatus.SENT,
          sent_at: now,
          metadata: messageData.metadata,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw error;

      // 채팅방 마지막 메시지 정보 업데이트
      await this.updateLastMessage(messageData.chatRoomId, message);

      // 첨부파일 정보 저장 (필요한 경우)
      if (messageData.attachmentUrl) {
        await this.saveAttachmentInfo(message.id, messageData);
      }

      // 메시지 상태를 delivered로 업데이트
      await this.updateMessageStatus(message.id, MessageStatus.DELIVERED);

      // 채팅방 참가자들에게 실시간 알림
      const readByUsers = await this.notifyParticipantsAboutNewMessage(message, userId);

      // 발신자 자동 읽음 처리
      await this.markMessageAsReadInternal(message.id, userId, messageData.chatRoomId);

      const messageResponse = await this.getMessageWithDetails(message.id);

      this.logger.log(`Message sent successfully: ${message.id}`);
      
      return {
        message: messageResponse,
        readByUsers: [userId, ...readByUsers],
        notificationsSent: readByUsers.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to send message: ${errorMessage}`);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('메시지 전송에 실패했습니다.');
    }
  }

  /**
   * 메시지 목록 조회 (페이지네이션)
   */
  async getMessages(userId: string, query: GetMessagesQueryDto): Promise<PaginatedResult<MessageResponseDto>> {
    try {
      this.logger.log(`Fetching messages for room ${query.chatRoomId}`);

      // 채팅방 참가자 권한 확인
      await this.validateParticipantAccess(query.chatRoomId, userId);

      let queryBuilder = this.supabase
        .from('messages')
        .select(`
          *,
          users:sender_id (
            id,
            name,
            profile
          ),
          reply_message:reply_to_message_id (
            content,
            type
          )
        `, { count: 'exact' })
        .eq('chat_room_id', query.chatRoomId);

      // 메시지 유형 필터
      if (query.messageType) {
        queryBuilder = queryBuilder.eq('type', query.messageType);
      }

      // 커서 기반 페이지네이션 (beforeMessageId 사용)
      if (query.beforeMessageId) {
        const { data: beforeMessage } = await this.supabase
          .from('messages')
          .select('sent_at')
          .eq('id', query.beforeMessageId)
          .single();

        if (beforeMessage) {
          queryBuilder = queryBuilder.lt('sent_at', beforeMessage.sent_at);
        }
      }

      // 정렬 및 제한
      queryBuilder = queryBuilder
        .order('sent_at', { ascending: false })
        .limit(query.limit);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      // 각 메시지의 읽음 수 계산
      const messagesWithReadCount = await Promise.all(
        (data || []).map(async (message) => {
          const readCount = await this.getMessageReadCount(message.id);
          return this.mapToResponseDto(message, readCount);
        })
      );

      // 시간순으로 다시 정렬 (최신 메시지가 마지막)
      messagesWithReadCount.reverse();

      const totalPages = Math.ceil((count || 0) / query.limit);

      return {
        data: messagesWithReadCount,
        total: count || 0,
        page: query.page,
        limit: query.limit,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get messages: ${errorMessage}`);
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException('메시지 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 메시지 읽음 처리
   */
  async markMessagesAsRead(userId: string, readData: MarkMessageAsReadDto): Promise<void> {
    try {
      this.logger.log(`Marking messages as read for user ${userId} in room ${readData.chatRoomId}`);

      // 채팅방 참가자 권한 확인
      await this.validateParticipantAccess(readData.chatRoomId, userId);

      // 각 메시지를 읽음 처리
      for (const messageId of readData.messageIds) {
        await this.markMessageAsReadInternal(messageId, userId, readData.chatRoomId);
      }

      // 참가자의 마지막 읽은 메시지 업데이트
      if (readData.messageIds.length > 0) {
        const lastMessageId = readData.messageIds[readData.messageIds.length - 1];
        await this.updateLastReadMessage(readData.chatRoomId, userId, lastMessageId);
      }

      // 다른 참가자들에게 읽음 상태 알림
      await this.notifyParticipantsAboutReadStatus(readData.chatRoomId, userId, readData.messageIds);

      this.logger.log(`Messages marked as read: ${readData.messageIds.length} messages`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to mark messages as read: ${errorMessage}`);
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException('메시지 읽음 처리에 실패했습니다.');
    }
  }

  /**
   * 메시지 상세 조회
   */
  async getMessage(messageId: string, userId: string): Promise<MessageResponseDto> {
    try {
      const { data: message, error } = await this.supabase
        .from('messages')
        .select('chat_room_id')
        .eq('id', messageId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('메시지를 찾을 수 없습니다.');
        }
        throw error;
      }

      // 채팅방 참가자 권한 확인
      await this.validateParticipantAccess(message.chat_room_id, userId);

      return this.getMessageWithDetails(messageId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get message: ${errorMessage}`);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('메시지 조회에 실패했습니다.');
    }
  }

  /**
   * 메시지 검색
   */
  async searchMessages(
    userId: string,
    chatRoomId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<MessageResponseDto>> {
    try {
      // 채팅방 참가자 권한 확인
      await this.validateParticipantAccess(chatRoomId, userId);

      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('messages')
        .select(`
          *,
          users:sender_id (
            id,
            name,
            profile
          )
        `, { count: 'exact' })
        .eq('chat_room_id', chatRoomId)
        .ilike('content', `%${searchTerm}%`)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const messagesWithReadCount = await Promise.all(
        (data || []).map(async (message) => {
          const readCount = await this.getMessageReadCount(message.id);
          return this.mapToResponseDto(message, readCount);
        })
      );

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: messagesWithReadCount,
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to search messages: ${errorMessage}`);
      throw new BadRequestException('메시지 검색에 실패했습니다.');
    }
  }

  /**
   * 읽지 않은 메시지 수 조회
   */
  async getUnreadMessageCount(chatRoomId: string, userId: string): Promise<number> {
    try {
      // 사용자의 마지막 읽은 메시지 시간 조회
      const { data: participant } = await this.supabase
        .from('chat_participants')
        .select('last_read_message_id')
        .eq('chat_room_id', chatRoomId)
        .eq('user_id', userId)
        .single();

      if (!participant?.last_read_message_id) {
        // 마지막 읽은 메시지가 없으면 모든 메시지가 읽지 않음
        const { count } = await this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', chatRoomId)
          .neq('sender_id', userId); // 본인이 보낸 메시지 제외

        return count || 0;
      }

      // 마지막 읽은 메시지 이후의 메시지 수 계산
      const { data: lastReadMessage } = await this.supabase
        .from('messages')
        .select('sent_at')
        .eq('id', participant.last_read_message_id)
        .single();

      if (!lastReadMessage) return 0;

      const { count } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', chatRoomId)
        .gt('sent_at', lastReadMessage.sent_at)
        .neq('sender_id', userId); // 본인이 보낸 메시지 제외

      return count || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to get unread message count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 시스템 메시지 전송
   */
  async sendSystemMessage(chatRoomId: string, content: string, metadata?: any): Promise<MessageResponseDto> {
    const systemMessageData: SendMessageDto = {
      chatRoomId,
      type: MessageType.SYSTEM,
      content,
      metadata
    };

    // 시스템 사용자 ID (관리자 또는 특별한 시스템 ID)
    const systemUserId = 'system';

    const result = await this.sendMessage(systemUserId, systemMessageData);
    return result.message;
  }

  /**
   * 내부 메서드들
   */

  /**
   * 참가자 권한 확인
   */
  private async validateParticipantAccess(chatRoomId: string, userId: string): Promise<void> {
    const { data: participant } = await this.supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_room_id', chatRoomId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (!participant) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }
  }

  /**
   * 메시지 내용 유효성 검증
   */
  private validateMessageContent(messageData: SendMessageDto): void {
    if (messageData.type === MessageType.TEXT && !messageData.content?.trim()) {
      throw new BadRequestException('텍스트 메시지는 내용이 필요합니다.');
    }

    if (messageData.type === MessageType.IMAGE && !messageData.attachmentUrl) {
      throw new BadRequestException('이미지 메시지는 첨부 파일이 필요합니다.');
    }

    if (messageData.type === MessageType.FILE && !messageData.attachmentUrl) {
      throw new BadRequestException('파일 메시지는 첨부 파일이 필요합니다.');
    }

    if (messageData.type === MessageType.LOCATION && (!messageData.latitude || !messageData.longitude)) {
      throw new BadRequestException('위치 메시지는 좌표 정보가 필요합니다.');
    }
  }

  /**
   * 채팅방 마지막 메시지 정보 업데이트
   */
  private async updateLastMessage(chatRoomId: string, message: MessageEntity): Promise<void> {
    await this.supabase
      .from('chat_rooms')
      .update({
        last_message_id: message.id,
        last_message_content: this.getMessagePreview(message),
        last_message_time: message.sent_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatRoomId);
  }

  /**
   * 첨부파일 정보 저장
   */
  private async saveAttachmentInfo(messageId: string, messageData: SendMessageDto): Promise<void> {
    try {
      const { data: message } = await this.supabase
        .from('messages')
        .select('chat_room_id, sender_id')
        .eq('id', messageId)
        .single();

      if (message && messageData.attachmentUrl) {
        await this.supabase
          .from('chat_attachments')
          .insert({
            message_id: messageId,
            chat_room_id: message.chat_room_id,
            file_name: messageData.attachmentName || 'Unknown',
            file_url: messageData.attachmentUrl,
            file_type: this.getFileTypeFromUrl(messageData.attachmentUrl),
            file_size: messageData.attachmentSize || 0,
            uploaded_by: message.sender_id,
            upload_status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to save attachment info: ${errorMessage}`);
    }
  }

  /**
   * 메시지 상태 업데이트
   */
  private async updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    await this.supabase
      .from('messages')
      .update({
        status,
        delivered_at: status === MessageStatus.DELIVERED ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);
  }

  /**
   * 메시지 읽음 처리 (내부)
   */
  private async markMessageAsReadInternal(messageId: string, userId: string, chatRoomId: string): Promise<void> {
    try {
      // 중복 읽음 상태 확인
      const { data: existingRead } = await this.supabase
        .from('message_read_status')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .single();

      if (!existingRead) {
        await this.supabase
          .from('message_read_status')
          .insert({
            message_id: messageId,
            user_id: userId,
            chat_room_id: chatRoomId,
            read_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to mark message as read: ${errorMessage}`);
    }
  }

  /**
   * 마지막 읽은 메시지 업데이트
   */
  private async updateLastReadMessage(chatRoomId: string, userId: string, messageId: string): Promise<void> {
    await this.supabase
      .from('chat_participants')
      .update({
        last_read_message_id: messageId,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('chat_room_id', chatRoomId)
      .eq('user_id', userId);
  }

  /**
   * 메시지 읽음 수 조회
   */
  private async getMessageReadCount(messageId: string): Promise<number> {
    const { count } = await this.supabase
      .from('message_read_status')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId);

    return count || 0;
  }

  /**
   * 메시지 상세 정보 조회
   */
  private async getMessageWithDetails(messageId: string): Promise<MessageResponseDto> {
    const { data: message, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        users:sender_id (
          id,
          name,
          profile
        ),
        reply_message:reply_to_message_id (
          content,
          type
        )
      `)
      .eq('id', messageId)
      .single();

    if (error) throw error;

    const readCount = await this.getMessageReadCount(messageId);
    return this.mapToResponseDto(message, readCount);
  }

  /**
   * 알림 메서드들
   */
  private async notifyParticipantsAboutNewMessage(message: MessageEntity, senderId: string): Promise<string[]> {
    try {
      // 채팅방 참가자 조회 (발신자 제외)
      const { data: participants } = await this.supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_room_id', message.chat_room_id)
        .neq('user_id', senderId)
        .is('left_at', null);

      const participantIds = participants?.map(p => p.user_id) || [];

      if (participantIds.length > 0) {
        // 실시간 알림 발송 (RealtimeNotificationService를 통해)
        // 실제 구현에서는 ChatGateway를 통해 직접 전송할 예정
        this.logger.log(`Notifying ${participantIds.length} participants about new message`);
      }

      return participantIds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to notify participants about new message: ${errorMessage}`);
      return [];
    }
  }

  private async notifyParticipantsAboutReadStatus(
    chatRoomId: string,
    userId: string,
    messageIds: string[]
  ): Promise<void> {
    // 구현 생략 - ChatGateway에서 처리
  }

  /**
   * 유틸리티 메서드들
   */
  private getMessagePreview(message: MessageEntity): string {
    switch (message.type) {
      case MessageType.TEXT:
        return message.content?.substring(0, 100) || '';
      case MessageType.IMAGE:
        return '📷 이미지';
      case MessageType.FILE:
        return '📎 파일';
      case MessageType.LOCATION:
        return '📍 위치';
      case MessageType.SYSTEM:
        return message.content || '시스템 메시지';
      default:
        return '메시지';
    }
  }

  private getFileTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) {
      return 'video';
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return 'document';
    }
    
    return 'file';
  }

  /**
   * 매핑 메서드
   */
  private mapToResponseDto(entity: any, readCount: number): MessageResponseDto {
    return {
      id: entity.id,
      chatRoomId: entity.chat_room_id,
      senderId: entity.sender_id,
      senderName: entity.users?.name || 'Unknown',
      senderRole: ParticipantRole.CUSTOMER, // 실제로는 참가자 정보에서 조회
      type: entity.type,
      content: entity.content,
      attachmentUrl: entity.attachment_url,
      attachmentName: entity.attachment_name,
      attachmentSize: entity.attachment_size,
      latitude: entity.latitude,
      longitude: entity.longitude,
      replyToMessageId: entity.reply_to_message_id,
      replyToMessage: entity.reply_message?.content,
      status: entity.status,
      readCount,
      sentAt: new Date(entity.sent_at),
      metadata: entity.metadata
    };
  }
} 