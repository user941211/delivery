/**
 * 실시간 알림 DTO
 * 
 * WebSocket을 통한 점주 실시간 알림을 위한 데이터 구조를 정의합니다.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsDateString, IsNumber } from 'class-validator';

/**
 * 알림 타입 열거형
 */
export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_CHANGE = 'ORDER_STATUS_CHANGE',
  PAYMENT_STATUS_CHANGE = 'PAYMENT_STATUS_CHANGE',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  URGENT_ORDER = 'URGENT_ORDER',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE'
}

/**
 * 알림 우선순위 열거형
 */
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * 기본 알림 데이터 DTO
 */
export class NotificationDto {
  @ApiProperty({
    description: '알림 ID',
    example: 'notification_12345'
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: '알림 타입',
    enum: NotificationType,
    example: NotificationType.NEW_ORDER
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: '점주 ID',
    example: 'owner_67890'
  })
  @IsString()
  ownerId: string;

  @ApiProperty({
    description: '매장 ID',
    example: 'restaurant_54321'
  })
  @IsString()
  restaurantId: string;

  @ApiProperty({
    description: '알림 제목',
    example: '새로운 주문이 접수되었습니다'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: '알림 메시지',
    example: '김고객님의 주문 #12345가 접수되었습니다.'
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: '알림 우선순위',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiPropertyOptional({
    description: '관련 주문 ID',
    example: 'order_98765'
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: '추가 데이터',
    example: { orderAmount: 25000, customerName: '김고객' }
  })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiProperty({
    description: '알림 생성 시간',
    example: '2024-12-07T10:30:00.000Z'
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: '알림 만료 시간',
    example: '2024-12-07T11:30:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * 새 주문 알림 데이터
 */
export class NewOrderNotificationDto extends NotificationDto {
  @ApiProperty({
    description: '주문 번호',
    example: 'ORD-2024120700001'
  })
  @IsString()
  orderNumber: string;

  @ApiProperty({
    description: '고객명',
    example: '김고객'
  })
  @IsString()
  customerName: string;

  @ApiProperty({
    description: '주문 금액',
    example: 25000
  })
  @IsNumber()
  orderAmount: number;

  @ApiProperty({
    description: '주문 아이템 수',
    example: 3
  })
  @IsNumber()
  itemCount: number;

  @ApiPropertyOptional({
    description: '특별 요청사항',
    example: '매운맛 빼고 포장해주세요'
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

/**
 * 주문 상태 변경 알림 데이터
 */
export class OrderStatusChangeNotificationDto extends NotificationDto {
  @ApiProperty({
    description: '주문 번호',
    example: 'ORD-2024120700001'
  })
  @IsString()
  orderNumber: string;

  @ApiProperty({
    description: '이전 상태',
    example: 'NEW'
  })
  @IsString()
  previousStatus: string;

  @ApiProperty({
    description: '현재 상태',
    example: 'CONFIRMED'
  })
  @IsString()
  currentStatus: string;

  @ApiPropertyOptional({
    description: '상태 변경 사유',
    example: '주문 확인 완료'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * WebSocket 구독 요청 DTO
 */
export class SubscribeNotificationDto {
  @ApiProperty({
    description: '점주 ID',
    example: 'owner_67890'
  })
  @IsString()
  ownerId: string;

  @ApiProperty({
    description: '매장 ID',
    example: 'restaurant_54321'
  })
  @IsString()
  restaurantId: string;

  @ApiPropertyOptional({
    description: '구독할 알림 타입들',
    type: [String],
    enum: NotificationType,
    example: [NotificationType.NEW_ORDER, NotificationType.ORDER_STATUS_CHANGE]
  })
  @IsOptional()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];
}

/**
 * WebSocket 연결 상태 DTO
 */
export class ConnectionStatusDto {
  @ApiProperty({
    description: '연결 상태',
    example: 'connected'
  })
  @IsString()
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: '연결 시간',
    example: '2024-12-07T10:30:00.000Z'
  })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({
    description: '메시지',
    example: '성공적으로 연결되었습니다'
  })
  @IsOptional()
  @IsString()
  message?: string;
} 