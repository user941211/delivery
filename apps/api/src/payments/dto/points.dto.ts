/**
 * 포인트 적립 및 사용 시스템 DTO
 * 
 * 포인트 적립, 사용, 관리를 위한 데이터 구조를 정의합니다.
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
  Min,
  Max,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 포인트 거래 타입 열거형
 */
export enum PointTransactionType {
  EARN = 'earn',           // 적립
  USE = 'use',             // 사용
  EXPIRE = 'expire',       // 만료
  REFUND = 'refund',       // 환불
  CANCEL = 'cancel',       // 취소
  ADJUSTMENT = 'adjustment' // 조정
}

/**
 * 포인트 적립 소스 열거형
 */
export enum PointEarnSource {
  ORDER_COMPLETION = 'order_completion',   // 주문 완료
  FIRST_ORDER = 'first_order',             // 첫 주문
  REVIEW_WRITE = 'review_write',           // 리뷰 작성
  EVENT = 'event',                         // 이벤트
  PROMOTION = 'promotion',                 // 프로모션
  REFERRAL = 'referral',                   // 추천
  ADMIN_ADJUSTMENT = 'admin_adjustment'    // 관리자 조정
}

/**
 * 포인트 거래 상태 열거형
 */
export enum PointTransactionStatus {
  PENDING = 'pending',     // 대기
  COMPLETED = 'completed', // 완료
  CANCELLED = 'cancelled', // 취소
  EXPIRED = 'expired'      // 만료
}

/**
 * 포인트 적립 규칙 DTO
 */
export class PointEarnRuleDto {
  @ApiProperty({ description: '적립 규칙 이름' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: PointEarnSource, description: '적립 소스' })
  @IsEnum(PointEarnSource)
  source: PointEarnSource;

  @ApiProperty({ description: '적립 비율 (퍼센트)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  earnRate: number;

  @ApiProperty({ description: '고정 적립 포인트' })
  @IsNumber()
  @Min(0)
  fixedPoints: number;

  @ApiProperty({ description: '최소 주문 금액' })
  @IsNumber()
  @Min(0)
  minOrderAmount: number;

  @ApiProperty({ description: '최대 적립 포인트' })
  @IsNumber()
  @Min(0)
  maxEarnPoints: number;

  @ApiProperty({ description: '활성 여부' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: '만료 일수 (0이면 무제한)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expiryDays?: number;

  @ApiPropertyOptional({ description: '가게 ID (특정 가게 전용)' })
  @IsOptional()
  @IsString()
  restaurantId?: string;
}

/**
 * 포인트 적립 요청 DTO
 */
export class EarnPointsDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '적립 포인트' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ enum: PointEarnSource, description: '적립 소스' })
  @IsEnum(PointEarnSource)
  source: PointEarnSource;

  @ApiPropertyOptional({ description: '주문 ID (주문 관련 적립 시)' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '주문 금액 (주문 관련 적립 시)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;

  @ApiPropertyOptional({ description: '가게 ID' })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '만료일 (지정하지 않으면 규칙에 따름)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * 포인트 사용 요청 DTO
 */
export class UsePointsDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '사용 포인트' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * 포인트 잔액 응답 DTO
 */
export class PointBalanceResponseDto {
  @ApiProperty({ description: '고객 ID' })
  customerId: string;

  @ApiProperty({ description: '총 포인트 잔액' })
  totalPoints: number;

  @ApiProperty({ description: '사용 가능한 포인트' })
  availablePoints: number;

  @ApiProperty({ description: '만료 예정 포인트' })
  expiringPoints: number;

  @ApiProperty({ description: '만료 예정일' })
  nextExpiryDate?: Date;

  @ApiProperty({ description: '포인트 적립 예정 (대기 중)' })
  pendingPoints: number;

  @ApiProperty({ description: '마지막 업데이트 시간' })
  lastUpdated: Date;
}

/**
 * 포인트 거래 내역 DTO
 */
export class PointTransactionDto {
  @ApiProperty({ description: '거래 ID' })
  id: string;

  @ApiProperty({ description: '고객 ID' })
  customerId: string;

  @ApiProperty({ enum: PointTransactionType, description: '거래 타입' })
  type: PointTransactionType;

  @ApiProperty({ description: '포인트 (양수: 적립, 음수: 사용)' })
  points: number;

  @ApiProperty({ description: '거래 전 잔액' })
  balanceBefore: number;

  @ApiProperty({ description: '거래 후 잔액' })
  balanceAfter: number;

  @ApiProperty({ enum: PointTransactionStatus, description: '거래 상태' })
  status: PointTransactionStatus;

  @ApiPropertyOptional({ enum: PointEarnSource, description: '적립 소스 (적립 시)' })
  earnSource?: PointEarnSource;

  @ApiPropertyOptional({ description: '주문 ID' })
  orderId?: string;

  @ApiPropertyOptional({ description: '가게 ID' })
  restaurantId?: string;

  @ApiProperty({ description: '설명' })
  description: string;

  @ApiPropertyOptional({ description: '만료일 (적립 시)' })
  expiresAt?: Date;

  @ApiProperty({ description: '거래 시간' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  metadata?: Record<string, any>;
}

/**
 * 포인트 거래 내역 조회 쿼리 DTO
 */
export class GetPointTransactionsQueryDto {
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

  @ApiPropertyOptional({ enum: PointTransactionType, description: '거래 타입 필터' })
  @IsOptional()
  @IsEnum(PointTransactionType)
  type?: PointTransactionType;

  @ApiPropertyOptional({ enum: PointTransactionStatus, description: '상태 필터' })
  @IsOptional()
  @IsEnum(PointTransactionStatus)
  status?: PointTransactionStatus;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

/**
 * 포인트 환불 요청 DTO
 */
export class RefundPointsDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '환불 포인트' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ description: '원본 주문 ID' })
  @IsString()
  originalOrderId: string;

  @ApiPropertyOptional({ description: '환불 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * 포인트 만료 처리 요청 DTO
 */
export class ExpirePointsDto {
  @ApiPropertyOptional({ description: '특정 고객 ID (지정하지 않으면 전체)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: '만료 기준일 (지정하지 않으면 오늘)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: '드라이런 모드 (실제 처리하지 않고 결과만 확인)' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

/**
 * 포인트 만료 결과 DTO
 */
export class PointExpiryResultDto {
  @ApiProperty({ description: '만료 처리된 고객 수' })
  processedCustomers: number;

  @ApiProperty({ description: '총 만료된 포인트' })
  totalExpiredPoints: number;

  @ApiProperty({ description: '만료 처리된 거래 수' })
  expiredTransactions: number;

  @ApiProperty({ description: '처리 시간' })
  processedAt: Date;

  @ApiPropertyOptional({ description: '만료된 고객별 상세 (최대 100명)' })
  customerDetails?: Array<{
    customerId: string;
    expiredPoints: number;
    expiredTransactions: number;
  }>;
}

/**
 * 포인트 통계 DTO
 */
export class PointStatsDto {
  @ApiProperty({ description: '총 적립된 포인트' })
  totalEarnedPoints: number;

  @ApiProperty({ description: '총 사용된 포인트' })
  totalUsedPoints: number;

  @ApiProperty({ description: '총 만료된 포인트' })
  totalExpiredPoints: number;

  @ApiProperty({ description: '현재 활성 포인트' })
  activePoints: number;

  @ApiProperty({ description: '활성 고객 수' })
  activeCustomers: number;

  @ApiProperty({ description: '오늘 적립된 포인트' })
  todayEarned: number;

  @ApiProperty({ description: '오늘 사용된 포인트' })
  todayUsed: number;

  @ApiProperty({ description: '7일 내 만료 예정 포인트' })
  expiringIn7Days: number;

  @ApiProperty({ description: '30일 내 만료 예정 포인트' })
  expiringIn30Days: number;

  @ApiProperty({ description: '통계 생성 시간' })
  generatedAt: Date;
}

/**
 * 포인트 예약 DTO (적립 예정)
 */
export class ReservePointsDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '예약 포인트' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: PointEarnSource, description: '적립 소스' })
  @IsEnum(PointEarnSource)
  source: PointEarnSource;

  @ApiPropertyOptional({ description: '예약 해제일 (지정하지 않으면 7일)' })
  @IsOptional()
  @IsDateString()
  releaseAt?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * 포인트 예약 확정 DTO
 */
export class ConfirmReservedPointsDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: '실제 적립할 포인트 (예약과 다를 수 있음)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualPoints?: number;
} 