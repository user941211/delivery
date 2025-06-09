/**
 * 점주용 주문 관리 DTO
 * 
 * 점주가 주문을 관리하기 위한 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsEnum, IsPositive, Min, Max, ValidateNested, IsDateString, IsNotEmpty, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../order.dto';

/**
 * 점주용 주문 상태 열거형
 * 점주가 관리할 수 있는 주문 상태
 */
export enum OwnerOrderStatus {
  NEW = 'NEW',                      // 새 주문 (확인 필요)
  CONFIRMED = 'CONFIRMED',          // 주문 확인됨
  PREPARING = 'PREPARING',          // 조리 중
  READY = 'READY',                  // 조리 완료 (픽업 대기)
  COMPLETED = 'COMPLETED',          // 배달 완료
  REJECTED = 'REJECTED',            // 주문 거부
  CANCELLED = 'CANCELLED',          // 주문 취소
}

/**
 * 주문 거부 사유 열거형
 */
export enum OrderRejectionReason {
  OUT_OF_STOCK = '재료 부족',              // 재료 소진
  KITCHEN_BUSY = '주방 과부하',            // 주방이 너무 바쁨
  DELIVERY_UNAVAILABLE = '배달 불가능',     // 배달 지역 제한
  RESTAURANT_CLOSED = '매장 마감',         // 매장 영업 시간 외
  SYSTEM_ERROR = '시스템 오류',            // 기술적 문제
  OTHER = '기타 사유',                    // 직접 입력 사유
}

/**
 * 점주용 주문 조회 쿼리 DTO
 */
export class OwnerOrderQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '페이지 번호는 숫자여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 아이템 수', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '페이지당 아이템 수는 숫자여야 합니다.' })
  @Min(1, { message: '페이지당 아이템 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 아이템 수는 100 이하여야 합니다.' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: '주문 상태 필터', enum: OwnerOrderStatus })
  @IsOptional()
  @IsEnum(OwnerOrderStatus, { message: '유효한 주문 상태를 선택해주세요.' })
  status?: OwnerOrderStatus;

  @ApiPropertyOptional({ description: '결제 상태 필터', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: '유효한 결제 상태를 선택해주세요.' })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: '시작 날짜', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2024-01-31' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  endDate?: string;

  @ApiPropertyOptional({ description: '주문번호로 검색', example: 'ORDER_20241207_001' })
  @IsOptional()
  @IsString({ message: '주문번호는 문자열이어야 합니다.' })
  orderNumber?: string;

  @ApiPropertyOptional({ description: '고객명으로 검색', example: '김고객' })
  @IsOptional()
  @IsString({ message: '고객명은 문자열이어야 합니다.' })
  customerName?: string;

  @ApiPropertyOptional({ description: '정렬 기준', example: 'createdAt', enum: ['createdAt', 'updatedAt', 'totalAmount'] })
  @IsOptional()
  @IsString({ message: '정렬 기준은 문자열이어야 합니다.' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: '정렬 순서', example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: '정렬 순서는 ASC 또는 DESC여야 합니다.' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: '긴급 주문만 조회', example: false })
  @IsOptional()
  @IsBoolean({ message: '긴급 주문 필터는 불린 값이어야 합니다.' })
  urgentOnly?: boolean;
}

/**
 * 주문 상태 업데이트 DTO
 */
export class UpdateOrderStatusDto {
  @ApiProperty({ description: '새로운 주문 상태', enum: OwnerOrderStatus })
  @IsEnum(OwnerOrderStatus, { message: '유효한 주문 상태를 선택해주세요.' })
  @IsNotEmpty({ message: '주문 상태는 필수입니다.' })
  status: OwnerOrderStatus;

  @ApiPropertyOptional({ description: '상태 변경 사유 또는 메모', example: '조리 완료되었습니다.' })
  @IsOptional()
  @IsString({ message: '메모는 문자열이어야 합니다.' })
  memo?: string;

  @ApiPropertyOptional({ description: '예상 조리 시간 (분)', example: 30, minimum: 1, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '조리 시간은 숫자여야 합니다.' })
  @Min(1, { message: '조리 시간은 최소 1분 이상이어야 합니다.' })
  @Max(300, { message: '조리 시간은 최대 300분까지 가능합니다.' })
  estimatedCookingTime?: number;

  @ApiPropertyOptional({ description: '고객에게 알림 발송 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '알림 발송 여부는 불린 값이어야 합니다.' })
  notifyCustomer?: boolean = true;
}

/**
 * 주문 거부 DTO
 */
export class RejectOrderDto {
  @ApiProperty({ description: '거부 사유', enum: OrderRejectionReason })
  @IsEnum(OrderRejectionReason, { message: '유효한 거부 사유를 선택해주세요.' })
  @IsNotEmpty({ message: '거부 사유는 필수입니다.' })
  reason: OrderRejectionReason;

  @ApiPropertyOptional({ description: '상세 거부 사유 (기타 사유 선택 시 필수)', example: '재료 발주가 지연되어 조리가 어렵습니다.' })
  @IsOptional()
  @IsString({ message: '상세 사유는 문자열이어야 합니다.' })
  detailReason?: string;

  @ApiPropertyOptional({ description: '고객에게 표시할 메시지', example: '죄송합니다. 재료 부족으로 주문을 처리할 수 없습니다.' })
  @IsOptional()
  @IsString({ message: '고객 메시지는 문자열이어야 합니다.' })
  customerMessage?: string;

  @ApiPropertyOptional({ description: '자동 환불 처리 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '자동 환불 여부는 불린 값이어야 합니다.' })
  autoRefund?: boolean = true;
}

/**
 * 조리 시간 설정 DTO
 */
export class SetCookingTimeDto {
  @ApiProperty({ description: '예상 조리 시간 (분)', example: 25, minimum: 1, maximum: 300 })
  @Type(() => Number)
  @IsNumber({}, { message: '조리 시간은 숫자여야 합니다.' })
  @Min(1, { message: '조리 시간은 최소 1분 이상이어야 합니다.' })
  @Max(300, { message: '조리 시간은 최대 300분까지 가능합니다.' })
  @IsNotEmpty({ message: '조리 시간은 필수입니다.' })
  estimatedCookingTime: number;

  @ApiPropertyOptional({ description: '설정 사유', example: '주문량이 많아 시간이 더 필요합니다.' })
  @IsOptional()
  @IsString({ message: '설정 사유는 문자열이어야 합니다.' })
  reason?: string;

  @ApiPropertyOptional({ description: '고객에게 알림 발송 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '알림 발송 여부는 불린 값이어야 합니다.' })
  notifyCustomer?: boolean = true;
}

/**
 * 점주용 주문 상세 응답 DTO
 */
export class OwnerOrderDetailDto {
  @ApiProperty({ description: '주문 ID', example: 'order_12345' })
  id: string;

  @ApiProperty({ description: '주문 번호', example: 'ORDER_20241207_001' })
  orderNumber: string;

  @ApiProperty({ description: '주문 상태', enum: OwnerOrderStatus })
  status: OwnerOrderStatus;

  @ApiProperty({ description: '결제 상태', enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: '고객 정보' })
  customer: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string;
  };

  @ApiProperty({ description: '배달 주소 정보' })
  deliveryAddress: {
    address: string;
    detailAddress?: string;
    postalCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @ApiProperty({ description: '주문 항목 목록' })
  items: Array<{
    id: string;
    menuId: string;
    menuName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    options: Array<{
      optionGroupName: string;
      optionName: string;
      additionalPrice: number;
    }>;
    specialRequests?: string;
  }>;

  @ApiProperty({ description: '가격 정보' })
  pricing: {
    subtotal: number;
    deliveryFee: number;
    discountAmount: number;
    totalAmount: number;
  };

  @ApiProperty({ description: '특별 요청사항' })
  specialRequests?: string;

  @ApiProperty({ description: '예상 조리 시간 (분)' })
  estimatedCookingTime?: number;

  @ApiProperty({ description: '주문 생성 시간' })
  createdAt: Date;

  @ApiProperty({ description: '마지막 업데이트 시간' })
  updatedAt: Date;

  @ApiProperty({ description: '주문 확인 시간' })
  confirmedAt?: Date;

  @ApiProperty({ description: '조리 시작 시간' })
  cookingStartedAt?: Date;

  @ApiProperty({ description: '조리 완료 시간' })
  cookingCompletedAt?: Date;

  @ApiProperty({ description: '배달 완료 시간' })
  deliveredAt?: Date;

  @ApiProperty({ description: '거부 정보 (거부된 경우)' })
  rejection?: {
    reason: OrderRejectionReason;
    detailReason?: string;
    rejectedAt: Date;
    rejectedBy: string;
  };

  @ApiProperty({ description: '상태 변경 이력' })
  statusHistory: Array<{
    status: OwnerOrderStatus;
    changedAt: Date;
    changedBy?: string;
    memo?: string;
  }>;
}

/**
 * 점주용 주문 목록 응답 DTO
 */
export class OwnerOrderListResponseDto {
  @ApiProperty({ description: '주문 목록', type: [OwnerOrderDetailDto] })
  @Type(() => OwnerOrderDetailDto)
  orders: OwnerOrderDetailDto[];

  @ApiProperty({ description: '총 주문 수', example: 150 })
  totalCount: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  currentPage: number;

  @ApiProperty({ description: '총 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '페이지당 아이템 수', example: 20 })
  limit: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPrevious: boolean;
}

/**
 * 점주용 주문 통계 DTO
 */
export class OwnerOrderStatsDto {
  @ApiProperty({ description: '오늘 주문 통계' })
  today: {
    totalOrders: number;
    newOrders: number;
    confirmedOrders: number;
    preparingOrders: number;
    completedOrders: number;
    rejectedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };

  @ApiProperty({ description: '이번 주 주문 통계' })
  thisWeek: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    peakHour: string;
    popularMenuItem: string;
  };

  @ApiProperty({ description: '이번 달 주문 통계' })
  thisMonth: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    growthRate: number;
    topMenuItems: Array<{
      menuName: string;
      orderCount: number;
      revenue: number;
    }>;
  };

  @ApiProperty({ description: '실시간 대기 중인 주문' })
  pending: {
    newOrdersCount: number;
    preparingOrdersCount: number;
    averageWaitTime: number;
    longestWaitTime: number;
  };
}

/**
 * 주문 상태 변경 알림 DTO
 */
export class OrderStatusNotificationDto {
  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ description: '이전 상태', enum: OwnerOrderStatus })
  previousStatus: OwnerOrderStatus;

  @ApiProperty({ description: '새로운 상태', enum: OwnerOrderStatus })
  newStatus: OwnerOrderStatus;

  @ApiProperty({ description: '변경 시간' })
  changedAt: Date;

  @ApiProperty({ description: '변경자' })
  changedBy?: string;

  @ApiProperty({ description: '변경 사유' })
  reason?: string;

  @ApiProperty({ description: '고객 알림 여부' })
  customerNotified: boolean;
}

/**
 * 주문 일괄 처리 DTO
 */
export class BulkOrderActionDto {
  @ApiProperty({ description: '주문 ID 목록', example: ['order_1', 'order_2', 'order_3'] })
  @IsArray({ message: '주문 ID 목록은 배열이어야 합니다.' })
  @IsString({ each: true, message: '주문 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '주문 ID 목록은 필수입니다.' })
  orderIds: string[];

  @ApiProperty({ description: '실행할 액션', enum: ['confirm', 'reject', 'start_cooking'] })
  @IsEnum(['confirm', 'reject', 'start_cooking'], { message: '유효한 액션을 선택해주세요.' })
  @IsNotEmpty({ message: '액션은 필수입니다.' })
  action: 'confirm' | 'reject' | 'start_cooking';

  @ApiPropertyOptional({ description: '액션 사유', example: '일괄 주문 승인' })
  @IsOptional()
  @IsString({ message: '액션 사유는 문자열이어야 합니다.' })
  reason?: string;

  @ApiPropertyOptional({ description: '예상 조리 시간 (분, 조리 시작 시)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '조리 시간은 숫자여야 합니다.' })
  @Min(1, { message: '조리 시간은 최소 1분 이상이어야 합니다.' })
  estimatedCookingTime?: number;
} 