/**
 * 부분 환불 및 취소 시스템 DTO
 * 
 * 주문 취소 및 부분 환불 처리를 위한 데이터 구조를 정의합니다.
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  ValidateNested,
  IsArray,
  Min,
  Max,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 환불 타입 열거형
 */
export enum RefundType {
  FULL = 'full',           // 전체 환불
  PARTIAL = 'partial',     // 부분 환불
  ITEM_CANCEL = 'item_cancel', // 메뉴 취소
  DELIVERY_CANCEL = 'delivery_cancel' // 배달비 환불
}

/**
 * 환불 상태 열거형
 */
export enum RefundStatus {
  PENDING = 'pending',         // 환불 대기
  PROCESSING = 'processing',   // 처리 중
  COMPLETED = 'completed',     // 완료
  FAILED = 'failed',          // 실패
  CANCELLED = 'cancelled'      // 취소
}

/**
 * 환불 사유 열거형
 */
export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',     // 고객 요청
  ITEM_UNAVAILABLE = 'item_unavailable',     // 품목 품절
  STORE_CLOSED = 'store_closed',             // 가게 휴무
  DELIVERY_FAILED = 'delivery_failed',       // 배달 실패
  PAYMENT_ERROR = 'payment_error',           // 결제 오류
  SYSTEM_ERROR = 'system_error',             // 시스템 오류
  QUALITY_ISSUE = 'quality_issue',           // 품질 문제
  WRONG_ORDER = 'wrong_order',               // 잘못된 주문
  OTHER = 'other'                            // 기타
}

/**
 * 환불 방법 열거형
 */
export enum RefundMethod {
  AUTO = 'auto',               // 자동 (결제 수단으로)
  CASH = 'cash',               // 현금
  POINT = 'point',             // 포인트
  MANUAL = 'manual'            // 수동 처리
}

/**
 * 환불 아이템 DTO
 */
export class RefundItemDto {
  @ApiProperty({ description: '메뉴 ID' })
  @IsString()
  menuId: string;

  @ApiProperty({ description: '메뉴명' })
  @IsString()
  menuName: string;

  @ApiProperty({ description: '환불 수량' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: '환불 금액' })
  @IsNumber()
  @Min(0)
  refundAmount: number;

  @ApiPropertyOptional({ description: '환불 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 환불 요청 DTO
 */
export class CreateRefundDto {
  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: RefundType, description: '환불 타입' })
  @IsEnum(RefundType)
  type: RefundType;

  @ApiProperty({ enum: RefundReason, description: '환불 사유' })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({ description: '환불 사유 상세' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonDetail?: string;

  @ApiPropertyOptional({ description: '환불 금액 (부분 환불 시)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({ description: '환불 아이템 목록 (아이템 취소 시)', type: [RefundItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  refundItems?: RefundItemDto[];

  @ApiPropertyOptional({ description: '배달비 환불 여부' })
  @IsOptional()
  @IsBoolean()
  refundDeliveryFee?: boolean;

  @ApiPropertyOptional({ enum: RefundMethod, description: '환불 방법' })
  @IsOptional()
  @IsEnum(RefundMethod)
  refundMethod?: RefundMethod;

  @ApiPropertyOptional({ description: '요청자 ID (고객 또는 관리자)' })
  @IsOptional()
  @IsString()
  requestedBy?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

/**
 * 환불 응답 DTO
 */
export class RefundResponseDto {
  @ApiProperty({ description: '환불 ID' })
  id: string;

  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ enum: RefundType, description: '환불 타입' })
  type: RefundType;

  @ApiProperty({ enum: RefundStatus, description: '환불 상태' })
  status: RefundStatus;

  @ApiProperty({ enum: RefundReason, description: '환불 사유' })
  reason: RefundReason;

  @ApiPropertyOptional({ description: '환불 사유 상세' })
  reasonDetail?: string;

  @ApiProperty({ description: '원본 결제 금액' })
  originalAmount: number;

  @ApiProperty({ description: '환불 금액' })
  refundAmount: number;

  @ApiProperty({ description: '환불 수수료' })
  refundFee: number;

  @ApiProperty({ description: '실제 환불 금액' })
  actualRefundAmount: number;

  @ApiPropertyOptional({ description: '환불 아이템 목록', type: [RefundItemDto] })
  refundItems?: RefundItemDto[];

  @ApiProperty({ enum: RefundMethod, description: '환불 방법' })
  refundMethod: RefundMethod;

  @ApiPropertyOptional({ description: 'PG사 거래 ID' })
  pgTransactionId?: string;

  @ApiPropertyOptional({ description: 'PG사 환불 ID' })
  pgRefundId?: string;

  @ApiPropertyOptional({ description: '환불 처리 완료 예정일' })
  expectedCompletionDate?: Date;

  @ApiProperty({ description: '요청 시간' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: '처리 시간' })
  processedAt?: Date;

  @ApiPropertyOptional({ description: '완료 시간' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '요청자 ID' })
  requestedBy?: string;

  @ApiPropertyOptional({ description: '처리자 ID' })
  processedBy?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  adminNote?: string;

  @ApiPropertyOptional({ description: '에러 메시지' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  metadata?: Record<string, any>;
}

/**
 * 환불 목록 조회 쿼리 DTO
 */
export class GetRefundsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: RefundStatus, description: '환불 상태 필터' })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ enum: RefundType, description: '환불 타입 필터' })
  @IsOptional()
  @IsEnum(RefundType)
  type?: RefundType;

  @ApiPropertyOptional({ enum: RefundReason, description: '환불 사유 필터' })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '최소 환불 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: '최대 환불 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: '가게 ID' })
  @IsOptional()
  @IsString()
  restaurantId?: string;
}

/**
 * 환불 상태 업데이트 DTO
 */
export class UpdateRefundStatusDto {
  @ApiProperty({ enum: RefundStatus, description: '새로운 환불 상태' })
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @ApiPropertyOptional({ description: '처리자 ID' })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;

  @ApiPropertyOptional({ description: '에러 메시지 (실패 시)' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'PG사 환불 ID' })
  @IsOptional()
  @IsString()
  pgRefundId?: string;
}

/**
 * 환불 가능 여부 확인 DTO
 */
export class CheckRefundEligibilityDto {
  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ enum: RefundType, description: '환불 타입' })
  @IsOptional()
  @IsEnum(RefundType)
  type?: RefundType;

  @ApiPropertyOptional({ description: '환불 금액 (부분 환불 시)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

/**
 * 환불 가능 여부 응답 DTO
 */
export class RefundEligibilityResponseDto {
  @ApiProperty({ description: '환불 가능 여부' })
  eligible: boolean;

  @ApiPropertyOptional({ description: '불가 사유' })
  reason?: string;

  @ApiProperty({ description: '최대 환불 가능 금액' })
  maxRefundableAmount: number;

  @ApiProperty({ description: '환불 수수료' })
  refundFee: number;

  @ApiProperty({ description: '실제 환불 예상 금액' })
  expectedRefundAmount: number;

  @ApiPropertyOptional({ description: '환불 가능한 아이템 목록' })
  refundableItems?: Array<{
    menuId: string;
    menuName: string;
    maxQuantity: number;
    unitPrice: number;
  }>;

  @ApiPropertyOptional({ description: '환불 제한 사항' })
  restrictions?: string[];
}

/**
 * 환불 통계 DTO
 */
export class RefundStatsDto {
  @ApiProperty({ description: '총 환불 건수' })
  totalRefunds: number;

  @ApiProperty({ description: '총 환불 금액' })
  totalRefundAmount: number;

  @ApiProperty({ description: '오늘 환불 건수' })
  todayRefunds: number;

  @ApiProperty({ description: '오늘 환불 금액' })
  todayRefundAmount: number;

  @ApiProperty({ description: '대기 중인 환불 건수' })
  pendingRefunds: number;

  @ApiProperty({ description: '대기 중인 환불 금액' })
  pendingRefundAmount: number;

  @ApiProperty({ description: '완료된 환불 건수' })
  completedRefunds: number;

  @ApiProperty({ description: '실패한 환불 건수' })
  failedRefunds: number;

  @ApiProperty({ description: '평균 처리 시간 (분)' })
  averageProcessingTime: number;

  @ApiProperty({ description: '환불 사유별 통계' })
  refundsByReason: Record<RefundReason, number>;

  @ApiProperty({ description: '환불 타입별 통계' })
  refundsByType: Record<RefundType, number>;

  @ApiProperty({ description: '통계 생성 시간' })
  generatedAt: Date;
}

/**
 * 자동 환불 설정 DTO
 */
export class AutoRefundConfigDto {
  @ApiProperty({ description: '자동 환불 활성화 여부' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '자동 환불 최대 금액' })
  @IsNumber()
  @Min(0)
  maxAmount: number;

  @ApiPropertyOptional({ description: '자동 환불 허용 사유', enum: RefundReason, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RefundReason, { each: true })
  allowedReasons?: RefundReason[];

  @ApiPropertyOptional({ description: '자동 환불 제외 시간 (분)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  excludeTimeAfterPayment?: number;

  @ApiPropertyOptional({ description: '수수료 면제 여부' })
  @IsOptional()
  @IsBoolean()
  waiveFee?: boolean;
} 