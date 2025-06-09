/**
 * 정기 결제 및 구독 시스템 DTO
 * 
 * 구독 계획, 정기 결제, 구독 관리를 위한 데이터 구조를 정의합니다.
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsIn
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 구독 상태 열거형
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',           // 활성
  PAUSED = 'paused',          // 일시정지
  CANCELLED = 'cancelled',     // 취소
  EXPIRED = 'expired',         // 만료
  PENDING = 'pending',         // 대기
  FAILED = 'failed'           // 실패
}

/**
 * 구독 주기 열거형
 */
export enum SubscriptionInterval {
  DAILY = 'daily',             // 매일
  WEEKLY = 'weekly',           // 매주
  BIWEEKLY = 'biweekly',      // 격주
  MONTHLY = 'monthly',         // 매월
  QUARTERLY = 'quarterly',     // 분기별
  YEARLY = 'yearly'           // 매년
}

/**
 * 구독 타입 열거형
 */
export enum SubscriptionType {
  FOOD_DELIVERY = 'food_delivery',     // 음식 배달
  PREMIUM_SERVICE = 'premium_service', // 프리미엄 서비스
  MEAL_PLAN = 'meal_plan',            // 식단 계획
  CUSTOM = 'custom'                   // 커스텀
}

/**
 * 결제 실패 처리 방식 열거형
 */
export enum FailureHandlingType {
  RETRY = 'retry',                 // 재시도
  PAUSE = 'pause',                 // 일시정지
  CANCEL = 'cancel',               // 즉시 취소
  NOTIFY_ONLY = 'notify_only'      // 알림만
}

/**
 * 구독 계획 DTO
 */
export class SubscriptionPlanDto {
  @ApiProperty({ description: '계획 이름' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '계획 설명' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: SubscriptionType, description: '구독 타입' })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({ description: '가격 (원)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: SubscriptionInterval, description: '구독 주기' })
  @IsEnum(SubscriptionInterval)
  interval: SubscriptionInterval;

  @ApiPropertyOptional({ description: '구독 주기 수 (예: 2주마다 -> intervalCount: 2, interval: weekly)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalCount?: number = 1;

  @ApiPropertyOptional({ description: '무료 체험 기간 (일)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialPeriodDays?: number;

  @ApiPropertyOptional({ description: '설정 요금 (초기 설정비)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  setupFee?: number;

  @ApiProperty({ description: '활성 여부' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: '최대 구독 기간 (개월, null이면 무제한)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDurationMonths?: number;

  @ApiPropertyOptional({ description: '구독에 포함된 혜택' })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiPropertyOptional({ description: '가게 ID (특정 가게 전용 구독)' })
  @IsOptional()
  @IsString()
  restaurantId?: string;
}

/**
 * 구독 생성 DTO
 */
export class CreateSubscriptionDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '구독 계획 ID' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: '결제 방법 ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: '구독 시작일 (미지정시 즉시)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '구독 종료일 (미지정시 무제한)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '할인 쿠폰 ID' })
  @IsOptional()
  @IsString()
  couponId?: string;

  @ApiPropertyOptional({ description: '구독 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: '자동 갱신 여부' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;

  @ApiPropertyOptional({ description: '배달 주소 ID' })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({ description: '배달 시간 설정' })
  @IsOptional()
  deliveryTimePreference?: {
    hour: number;      // 0-23
    minute: number;    // 0-59
    timezone: string;  // 'Asia/Seoul'
  };
}

/**
 * 구독 응답 DTO
 */
export class SubscriptionResponseDto {
  @ApiProperty({ description: '구독 ID' })
  id: string;

  @ApiProperty({ description: '고객 ID' })
  customerId: string;

  @ApiProperty({ description: '구독 계획 정보' })
  plan: SubscriptionPlanDto;

  @ApiProperty({ enum: SubscriptionStatus, description: '구독 상태' })
  status: SubscriptionStatus;

  @ApiProperty({ description: '현재 주기 가격' })
  currentPrice: number;

  @ApiProperty({ description: '다음 결제일' })
  nextBillingDate?: Date;

  @ApiProperty({ description: '구독 시작일' })
  startDate: Date;

  @ApiPropertyOptional({ description: '구독 종료일' })
  endDate?: Date;

  @ApiPropertyOptional({ description: '무료 체험 종료일' })
  trialEndDate?: Date;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '취소일' })
  cancelledAt?: Date;

  @ApiPropertyOptional({ description: '일시정지일' })
  pausedAt?: Date;

  @ApiProperty({ description: '총 결제 횟수' })
  totalBillingCycles: number;

  @ApiProperty({ description: '성공한 결제 횟수' })
  successfulPayments: number;

  @ApiProperty({ description: '실패한 결제 횟수' })
  failedPayments: number;

  @ApiProperty({ description: '총 결제 금액' })
  totalPaidAmount: number;

  @ApiPropertyOptional({ description: '할인 정보' })
  discountInfo?: {
    couponId: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
  };

  @ApiPropertyOptional({ description: '구독 메타데이터' })
  metadata?: Record<string, any>;
}

/**
 * 구독 목록 조회 쿼리 DTO
 */
export class GetSubscriptionsQueryDto {
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

  @ApiPropertyOptional({ enum: SubscriptionStatus, description: '구독 상태 필터' })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: SubscriptionType, description: '구독 타입 필터' })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: '가게 ID' })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 구독 상태 업데이트 DTO
 */
export class UpdateSubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionStatus, description: '새로운 구독 상태' })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiPropertyOptional({ description: '상태 변경 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: '처리자 ID' })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiPropertyOptional({ description: '일시정지 기간 (일수, 일시정지 시에만)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pauseDurationDays?: number;

  @ApiPropertyOptional({ description: '즉시 적용 여부' })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean = true;
}

/**
 * 구독 수정 DTO
 */
export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: '새로운 구독 계획 ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: '새로운 결제 방법 ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: '구독 종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '자동 갱신 여부' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: '배달 주소 ID' })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({ description: '배달 시간 설정' })
  @IsOptional()
  deliveryTimePreference?: {
    hour: number;
    minute: number;
    timezone: string;
  };

  @ApiPropertyOptional({ description: '구독 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/**
 * 결제 기록 DTO
 */
export class SubscriptionPaymentDto {
  @ApiProperty({ description: '결제 ID' })
  id: string;

  @ApiProperty({ description: '구독 ID' })
  subscriptionId: string;

  @ApiProperty({ description: '결제 금액' })
  amount: number;

  @ApiProperty({ description: '결제 상태' })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @ApiProperty({ description: '결제 시도일' })
  attemptDate: Date;

  @ApiPropertyOptional({ description: '결제 완료일' })
  paidDate?: Date;

  @ApiProperty({ description: '결제 주기 번호' })
  billingCycle: number;

  @ApiPropertyOptional({ description: 'PG사 거래 ID' })
  pgTransactionId?: string;

  @ApiPropertyOptional({ description: '실패 사유' })
  failureReason?: string;

  @ApiPropertyOptional({ description: '재시도 횟수' })
  retryCount?: number;

  @ApiPropertyOptional({ description: '다음 재시도 일시' })
  nextRetryDate?: Date;
}

/**
 * 구독 통계 DTO
 */
export class SubscriptionStatsDto {
  @ApiProperty({ description: '총 구독 수' })
  totalSubscriptions: number;

  @ApiProperty({ description: '활성 구독 수' })
  activeSubscriptions: number;

  @ApiProperty({ description: '일시정지된 구독 수' })
  pausedSubscriptions: number;

  @ApiProperty({ description: '취소된 구독 수' })
  cancelledSubscriptions: number;

  @ApiProperty({ description: '월간 경상 수익 (MRR)' })
  monthlyRecurringRevenue: number;

  @ApiProperty({ description: '연간 경상 수익 (ARR)' })
  annualRecurringRevenue: number;

  @ApiProperty({ description: '평균 고객 생애 가치 (CLTV)' })
  averageCustomerLifetimeValue: number;

  @ApiProperty({ description: '이탈률 (%)' })
  churnRate: number;

  @ApiProperty({ description: '오늘 신규 구독' })
  todayNewSubscriptions: number;

  @ApiProperty({ description: '오늘 취소된 구독' })
  todayCancelledSubscriptions: number;

  @ApiProperty({ description: '구독 타입별 통계' })
  subscriptionsByType: Record<SubscriptionType, number>;

  @ApiProperty({ description: '구독 주기별 통계' })
  subscriptionsByInterval: Record<SubscriptionInterval, number>;

  @ApiProperty({ description: '평균 구독 기간 (개월)' })
  averageSubscriptionDuration: number;

  @ApiProperty({ description: '통계 생성 시간' })
  generatedAt: Date;
}

/**
 * 구독 결제 재시도 설정 DTO
 */
export class RetryConfigDto {
  @ApiProperty({ description: '재시도 활성화 여부' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '최대 재시도 횟수' })
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetries: number;

  @ApiProperty({ description: '재시도 간격 (일)', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  retryIntervalDays: number[]; // 예: [1, 3, 7] = 1일 후, 3일 후, 7일 후

  @ApiProperty({ enum: FailureHandlingType, description: '최종 실패 시 처리 방식' })
  @IsEnum(FailureHandlingType)
  finalFailureAction: FailureHandlingType;

  @ApiPropertyOptional({ description: '결제 실패 알림 발송 여부' })
  @IsOptional()
  @IsBoolean()
  sendFailureNotifications?: boolean = true;
}

/**
 * 구독 일괄 작업 DTO
 */
export class BulkSubscriptionActionDto {
  @ApiProperty({ description: '구독 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  subscriptionIds: string[];

  @ApiProperty({ description: '작업 타입' })
  @IsIn(['pause', 'resume', 'cancel', 'update_plan'])
  action: 'pause' | 'resume' | 'cancel' | 'update_plan';

  @ApiPropertyOptional({ description: '작업 사유' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '새 계획 ID (update_plan 시)' })
  @IsOptional()
  @IsString()
  newPlanId?: string;

  @ApiPropertyOptional({ description: '일시정지 기간 (pause 시)' })
  @IsOptional()
  @IsNumber()
  pauseDurationDays?: number;
}

/**
 * 구독 갱신 미리보기 DTO
 */
export class SubscriptionRenewalPreviewDto {
  @ApiProperty({ description: '구독 ID' })
  subscriptionId: string;

  @ApiProperty({ description: '다음 결제 예정일' })
  nextBillingDate: Date;

  @ApiProperty({ description: '결제 예정 금액' })
  upcomingAmount: number;

  @ApiProperty({ description: '적용될 할인' })
  appliedDiscounts: Array<{
    type: 'coupon' | 'loyalty' | 'promotion';
    name: string;
    discountAmount: number;
  }>;

  @ApiProperty({ description: '최종 결제 금액' })
  finalAmount: number;

  @ApiProperty({ description: '결제 방법 정보' })
  paymentMethod: {
    type: string;
    lastFour?: string;
    expiryDate?: string;
  };

  @ApiProperty({ description: '구독 갱신 후 상태' })
  renewalStatus: 'success' | 'pending' | 'requires_action';

  @ApiPropertyOptional({ description: '주의사항' })
  warnings?: string[];
} 