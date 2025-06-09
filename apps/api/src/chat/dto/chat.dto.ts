/**
 * 채팅 시스템 DTO
 * 
 * 채팅방, 메시지, 참가자 관리를 위한 데이터 구조를 정의합니다.
 */

import { 
  IsString, 
  IsUUID, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  IsBoolean, 
  IsDateString,
  IsNumber,
  ValidateNested,
  IsUrl,
  MinLength,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 채팅방 유형 열거형
 */
export enum ChatRoomType {
  ORDER_SUPPORT = 'order_support',        // 주문 관련 고객-점주 채팅
  DELIVERY_COORDINATION = 'delivery_coordination', // 배달 관련 고객-배달기사 채팅
  PICKUP_COORDINATION = 'pickup_coordination',     // 픽업 관련 점주-배달기사 채팅
  CUSTOMER_SERVICE = 'customer_service',           // 고객 서비스 채팅
  GROUP_CHAT = 'group_chat'                       // 그룹 채팅 (3명 이상)
}

/**
 * 메시지 유형 열거형
 */
export enum MessageType {
  TEXT = 'text',                 // 텍스트 메시지
  IMAGE = 'image',               // 이미지 첨부
  FILE = 'file',                 // 파일 첨부
  LOCATION = 'location',         // 위치 공유
  SYSTEM = 'system',             // 시스템 메시지
  ORDER_INFO = 'order_info',     // 주문 정보 공유
  QUICK_REPLY = 'quick_reply'    // 빠른 답장
}

/**
 * 참가자 역할 열거형
 */
export enum ParticipantRole {
  CUSTOMER = 'customer',         // 고객
  OWNER = 'owner',              // 점주
  DRIVER = 'driver',            // 배달기사
  ADMIN = 'admin'               // 관리자
}

/**
 * 채팅방 상태 열거형
 */
export enum ChatRoomStatus {
  ACTIVE = 'active',            // 활성
  INACTIVE = 'inactive',        // 비활성
  ARCHIVED = 'archived',        // 보관됨
  BLOCKED = 'blocked'           // 차단됨
}

/**
 * 메시지 상태 열거형
 */
export enum MessageStatus {
  SENT = 'sent',                // 전송됨
  DELIVERED = 'delivered',      // 전달됨
  READ = 'read',                // 읽음
  FAILED = 'failed'             // 실패
}

/**
 * 채팅방 생성 DTO
 */
export class CreateChatRoomDto {
  @ApiProperty({ enum: ChatRoomType, description: '채팅방 유형' })
  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @ApiPropertyOptional({ description: '채팅방 제목' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: '참가자 ID 목록', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: '관련 주문 ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: '관련 레스토랑 ID' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @ApiPropertyOptional({ description: '초기 메시지' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 채팅방 업데이트 DTO
 */
export class UpdateChatRoomDto {
  @ApiPropertyOptional({ description: '채팅방 제목' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ enum: ChatRoomStatus, description: '채팅방 상태' })
  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 메시지 전송 DTO
 */
export class SendMessageDto {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiProperty({ enum: MessageType, description: '메시지 유형' })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({ description: '메시지 내용' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ description: '첨부 파일 URL' })
  @IsOptional()
  @IsUrl()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: '첨부 파일 이름' })
  @IsOptional()
  @IsString()
  attachmentName?: string;

  @ApiPropertyOptional({ description: '첨부 파일 크기 (바이트)' })
  @IsOptional()
  @IsNumber()
  attachmentSize?: number;

  @ApiPropertyOptional({ description: '위치 정보 (위도)' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '위치 정보 (경도)' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '답장할 메시지 ID' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 참가자 추가 DTO
 */
export class AddParticipantDto {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiProperty({ description: '추가할 사용자 ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ParticipantRole, description: '참가자 역할' })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiPropertyOptional({ description: '초대 메시지' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  inviteMessage?: string;
}

/**
 * 메시지 읽음 처리 DTO
 */
export class MarkMessageAsReadDto {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiProperty({ description: '읽은 메시지 ID 목록', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}

/**
 * 채팅방 조회 쿼리 DTO
 */
export class GetChatRoomsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ChatRoomType, description: '채팅방 유형' })
  @IsOptional()
  @IsEnum(ChatRoomType)
  type?: ChatRoomType;

  @ApiPropertyOptional({ enum: ChatRoomStatus, description: '채팅방 상태' })
  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: '검색 키워드' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

/**
 * 메시지 조회 쿼리 DTO
 */
export class GetMessagesQueryDto {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID()
  chatRoomId: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', default: 50 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ description: '기준 메시지 ID (커서 기반 페이지네이션)' })
  @IsOptional()
  @IsUUID()
  beforeMessageId?: string;

  @ApiPropertyOptional({ description: '메시지 유형 필터' })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;
}

/**
 * 채팅방 응답 DTO
 */
export class ChatRoomResponseDto {
  @ApiProperty({ description: '채팅방 ID' })
  id: string;

  @ApiProperty({ enum: ChatRoomType, description: '채팅방 유형' })
  type: ChatRoomType;

  @ApiProperty({ description: '채팅방 제목' })
  title: string;

  @ApiProperty({ enum: ChatRoomStatus, description: '채팅방 상태' })
  status: ChatRoomStatus;

  @ApiProperty({ description: '참가자 수' })
  participantCount: number;

  @ApiProperty({ description: '마지막 메시지 내용' })
  lastMessageContent?: string;

  @ApiProperty({ description: '마지막 메시지 시간' })
  lastMessageTime?: Date;

  @ApiProperty({ description: '읽지 않은 메시지 수' })
  unreadCount: number;

  @ApiProperty({ description: '관련 주문 ID' })
  orderId?: string;

  @ApiProperty({ description: '관련 레스토랑 ID' })
  restaurantId?: string;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  updatedAt: Date;

  @ApiProperty({ description: '메타데이터' })
  metadata?: Record<string, any>;
}

/**
 * 메시지 응답 DTO
 */
export class MessageResponseDto {
  @ApiProperty({ description: '메시지 ID' })
  id: string;

  @ApiProperty({ description: '채팅방 ID' })
  chatRoomId: string;

  @ApiProperty({ description: '발신자 ID' })
  senderId: string;

  @ApiProperty({ description: '발신자 이름' })
  senderName: string;

  @ApiProperty({ enum: ParticipantRole, description: '발신자 역할' })
  senderRole: ParticipantRole;

  @ApiProperty({ enum: MessageType, description: '메시지 유형' })
  type: MessageType;

  @ApiProperty({ description: '메시지 내용' })
  content?: string;

  @ApiProperty({ description: '첨부 파일 URL' })
  attachmentUrl?: string;

  @ApiProperty({ description: '첨부 파일 이름' })
  attachmentName?: string;

  @ApiProperty({ description: '첨부 파일 크기' })
  attachmentSize?: number;

  @ApiProperty({ description: '위치 정보 (위도)' })
  latitude?: number;

  @ApiProperty({ description: '위치 정보 (경도)' })
  longitude?: number;

  @ApiProperty({ description: '답장 대상 메시지 ID' })
  replyToMessageId?: string;

  @ApiProperty({ description: '답장 대상 메시지 내용' })
  replyToMessage?: string;

  @ApiProperty({ enum: MessageStatus, description: '메시지 상태' })
  status: MessageStatus;

  @ApiProperty({ description: '읽은 사용자 수' })
  readCount: number;

  @ApiProperty({ description: '전송 시간' })
  sentAt: Date;

  @ApiProperty({ description: '메타데이터' })
  metadata?: Record<string, any>;
}

/**
 * 참가자 응답 DTO
 */
export class ParticipantResponseDto {
  @ApiProperty({ description: '참가자 ID' })
  id: string;

  @ApiProperty({ description: '채팅방 ID' })
  chatRoomId: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  userName: string;

  @ApiProperty({ enum: ParticipantRole, description: '역할' })
  role: ParticipantRole;

  @ApiProperty({ description: '마지막 읽은 메시지 ID' })
  lastReadMessageId?: string;

  @ApiProperty({ description: '마지막 활동 시간' })
  lastActiveAt: Date;

  @ApiProperty({ description: '온라인 여부' })
  isOnline: boolean;

  @ApiProperty({ description: '참여 시간' })
  joinedAt: Date;

  @ApiProperty({ description: '나간 시간' })
  leftAt?: Date;
}

/**
 * 채팅 통계 DTO
 */
export class ChatStatsDto {
  @ApiProperty({ description: '총 채팅방 수' })
  totalChatRooms: number;

  @ApiProperty({ description: '활성 채팅방 수' })
  activeChatRooms: number;

  @ApiProperty({ description: '총 메시지 수' })
  totalMessages: number;

  @ApiProperty({ description: '읽지 않은 메시지 수' })
  unreadMessages: number;

  @ApiProperty({ description: '유형별 채팅방 수' })
  roomsByType: Record<ChatRoomType, number>;

  @ApiProperty({ description: '일별 메시지 수 (최근 7일)' })
  dailyMessageCounts: { date: string; count: number }[];
}

/**
 * 빠른 답장 옵션 DTO
 */
export class QuickReplyOptionDto {
  @ApiProperty({ description: '답장 텍스트' })
  @IsString()
  @MaxLength(100)
  text: string;

  @ApiProperty({ description: '답장 코드' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: '아이콘' })
  @IsOptional()
  @IsString()
  icon?: string;
}

/**
 * 채팅방 설정 DTO
 */
export class ChatRoomSettingsDto {
  @ApiPropertyOptional({ description: '알림 설정' })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ description: '자동 응답 메시지' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  autoReplyMessage?: string;

  @ApiPropertyOptional({ description: '빠른 답장 옵션', type: [QuickReplyOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickReplyOptionDto)
  quickReplyOptions?: QuickReplyOptionDto[];
} 