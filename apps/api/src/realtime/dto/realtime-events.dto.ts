/**
 * 실시간 이벤트 DTO
 * 
 * WebSocket을 통해 전송되는 모든 실시간 이벤트의 데이터 구조를 정의합니다.
 */

import { IsString, IsUUID, IsEnum, IsOptional, IsNumber, IsObject, IsDateString, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 사용자 유형 열거형
 */
export enum UserType {
  CUSTOMER = 'customer',
  OWNER = 'owner',
  DRIVER = 'driver',
  ADMIN = 'admin'
}

/**
 * 실시간 이벤트 유형 열거형
 */
export enum RealtimeEventType {
  // 주문 관련 이벤트
  ORDER_STATUS_UPDATE = 'order-status-update',
  ORDER_CREATED = 'order-created',
  ORDER_ACCEPTED = 'order-accepted',
  ORDER_REJECTED = 'order-rejected',
  ORDER_READY = 'order-ready',
  ORDER_PICKED_UP = 'order-picked-up',
  ORDER_DELIVERED = 'order-delivered',
  ORDER_CANCELLED = 'order-cancelled',

  // 배달 관련 이벤트  
  DELIVERY_ASSIGNMENT = 'delivery-assignment',
  DELIVERY_ACCEPTED = 'delivery-accepted',
  DELIVERY_REJECTED = 'delivery-rejected',
  DRIVER_LOCATION_UPDATE = 'driver-location-update',
  DRIVER_STATUS_UPDATE = 'driver-status-update',

  // 시스템 이벤트
  NOTIFICATION = 'notification',
  SYSTEM_ALERT = 'system-alert',
  CONNECTION_STATUS = 'connection-status',

  // 룸 관리 이벤트
  ROOM_JOINED = 'room-joined',
  ROOM_LEFT = 'room-left',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left'
}

/**
 * 알림 우선순위 열거형
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * 기본 실시간 이벤트 인터페이스
 */
export interface BaseRealtimeEvent {
  eventType: RealtimeEventType;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * 위치 정보 DTO
 */
export class LocationDto {
  @ApiProperty({ description: '위도', example: 37.5665 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: '경도', example: 126.9780 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: '정확도 (미터)', example: 10 })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: '주소', example: '서울시 중구 명동길 123' })
  @IsOptional()
  @IsString()
  address?: string;
}

/**
 * 주문 상태 업데이트 이벤트 DTO
 */
export class OrderStatusUpdateEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.ORDER_STATUS_UPDATE })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.ORDER_STATUS_UPDATE;

  @ApiProperty({ description: '주문 ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: '새로운 주문 상태' })
  @IsString()
  status: string;

  @ApiProperty({ description: '이전 주문 상태' })
  @IsString()
  previousStatus: string;

  @ApiPropertyOptional({ description: '상태 변경 메시지' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '관련 사용자 ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '예상 시간 정보' })
  @IsOptional()
  @IsObject()
  estimatedTimes?: {
    preparation?: number; // 준비 시간 (분)
    delivery?: number;    // 배달 시간 (분)
    total?: number;       // 총 시간 (분)
  };

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 배달기사 위치 업데이트 이벤트 DTO
 */
export class DriverLocationUpdateEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.DRIVER_LOCATION_UPDATE })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.DRIVER_LOCATION_UPDATE;

  @ApiProperty({ description: '주문 ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: '배달기사 ID' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: '배달기사명' })
  @IsString()
  driverName: string;

  @ApiProperty({ description: '위치 정보', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: '배달기사 상태' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '속도 (km/h)' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: '방향 (도)' })
  @IsOptional()
  @IsNumber()
  bearing?: number;

  @ApiPropertyOptional({ description: '예상 도착 시간 (분)' })
  @IsOptional()
  @IsNumber()
  estimatedArrivalTime?: number;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '관련 사용자 ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 배달 배정 이벤트 DTO
 */
export class DeliveryAssignmentEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.DELIVERY_ASSIGNMENT })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.DELIVERY_ASSIGNMENT;

  @ApiProperty({ description: '주문 ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: '배달기사 ID' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: '배정 ID' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ description: '배정 방식' })
  @IsString()
  assignmentMethod: string;

  @ApiPropertyOptional({ description: '응답 제한 시간 (분)' })
  @IsOptional()
  @IsNumber()
  responseTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: '특별 지시사항' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '관련 사용자 ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '주문 상세 정보' })
  @IsOptional()
  @IsObject()
  orderDetails?: {
    restaurantName: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; }>;
    pickupAddress: string;
    deliveryAddress: string;
    totalAmount: number;
  };

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 알림 이벤트 DTO
 */
export class NotificationEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.NOTIFICATION })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.NOTIFICATION;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationPriority, description: '알림 우선순위' })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiPropertyOptional({ description: '알림 카테고리' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '액션 버튼 정보' })
  @IsOptional()
  @IsArray()
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;

  @ApiPropertyOptional({ description: '이미지 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '딥링크 URL' })
  @IsOptional()
  @IsString()
  deepLink?: string;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '대상 사용자 ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '자동 해제 시간 (초)' })
  @IsOptional()
  @IsNumber()
  autoDissmissAfter?: number;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 시스템 알림 이벤트 DTO
 */
export class SystemAlertEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.SYSTEM_ALERT })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.SYSTEM_ALERT;

  @ApiProperty({ description: '알림 유형' })
  @IsString()
  alertType: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationPriority, description: '심각도' })
  @IsEnum(NotificationPriority)
  severity: NotificationPriority;

  @ApiPropertyOptional({ description: '영향을 받는 서비스' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedServices?: string[];

  @ApiPropertyOptional({ description: '예상 해결 시간 (분)' })
  @IsOptional()
  @IsNumber()
  estimatedResolutionTime?: number;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 연결 상태 이벤트 DTO
 */
export class ConnectionStatusEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType, example: RealtimeEventType.CONNECTION_STATUS })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.CONNECTION_STATUS;

  @ApiProperty({ description: '연결 상태' })
  @IsString()
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';

  @ApiPropertyOptional({ description: '소켓 ID' })
  @IsOptional()
  @IsString()
  socketId?: string;

  @ApiPropertyOptional({ description: '사용자 유형' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ description: '연결된 룸 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rooms?: string[];

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '사용자 ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 룸 참여/나가기 이벤트 DTO
 */
export class RoomEventDto implements BaseRealtimeEvent {
  @ApiProperty({ enum: RealtimeEventType })
  @IsEnum(RealtimeEventType)
  eventType: RealtimeEventType.ROOM_JOINED | RealtimeEventType.ROOM_LEFT | RealtimeEventType.USER_JOINED | RealtimeEventType.USER_LEFT;

  @ApiProperty({ description: '룸 ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ enum: UserType, description: '사용자 유형' })
  @IsEnum(UserType)
  userType: UserType;

  @ApiPropertyOptional({ description: '사용자명' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: '사용자 ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 통합 실시간 이벤트 유니온 타입
 */
export type RealtimeEvent = 
  | OrderStatusUpdateEventDto
  | DriverLocationUpdateEventDto
  | DeliveryAssignmentEventDto
  | NotificationEventDto
  | SystemAlertEventDto
  | ConnectionStatusEventDto
  | RoomEventDto; 