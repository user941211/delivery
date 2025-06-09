/**
 * 쿠폰 및 할인 시스템 DTO
 * 
 * 쿠폰 생성, 관리, 적용 및 할인 계산을 위한 데이터 구조를 정의합니다.
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 쿠폰 타입 열거형
 */
export enum CouponType {
  PERCENTAGE = 'percentage',     // 퍼센트 할인
  FIXED_AMOUNT = 'fixed_amount', // 고정 금액 할인
  FREE_DELIVERY = 'free_delivery', // 무료 배송
  BUY_ONE_GET_ONE = 'bogo',      // 1+1 할인
  MENU_DISCOUNT = 'menu_discount' // 특정 메뉴 할인
}

/**
 * 쿠폰 상태 열거형
 */
export enum CouponStatus {
  ACTIVE = 'active',       // 활성
  INACTIVE = 'inactive',   // 비활성
  EXPIRED = 'expired',     // 만료
  USED = 'used',          // 사용됨
  CANCELLED = 'cancelled'  // 취소됨
}

/**
 * 할인 적용 대상 열거형
 */
export enum DiscountTarget {
  ORDER_TOTAL = 'order_total',     // 주문 총액
  DELIVERY_FEE = 'delivery_fee',   // 배송비
  SPECIFIC_MENU = 'specific_menu', // 특정 메뉴
  CATEGORY = 'category',           // 카테고리
  RESTAURANT = 'restaurant'        // 특정 가게
}

/**
 * 쿠폰 사용 조건 DTO
 */
export class CouponConditionDto {
  @ApiPropertyOptional({ description: '최소 주문 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: '최대 할인 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: '적용 가능한 가게 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableRestaurants?: string[];

  @ApiPropertyOptional({ description: '적용 가능한 메뉴 카테고리' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @ApiPropertyOptional({ description: '신규 고객 전용 여부' })
  @IsOptional()
  @IsBoolean()
  newCustomerOnly?: boolean;

  @ApiPropertyOptional({ description: '최대 사용 횟수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsageCount?: number;

  @ApiPropertyOptional({ description: '고객당 최대 사용 횟수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsagePerCustomer?: number;
}

/**
 * 쿠폰 생성 DTO
 */
export class CreateCouponDto {
  @ApiProperty({ description: '쿠폰 이름' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '쿠폰 설명' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ description: '쿠폰 코드' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({ enum: CouponType, description: '쿠폰 타입' })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: '할인 값 (퍼센트 또는 고정 금액)' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ enum: DiscountTarget, description: '할인 적용 대상' })
  @IsEnum(DiscountTarget)
  target: DiscountTarget;

  @ApiProperty({ description: '유효 시작일' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: '유효 종료일' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ description: '쿠폰 사용 조건', type: CouponConditionDto })
  @ValidateNested()
  @Type(() => CouponConditionDto)
  conditions: CouponConditionDto;

  @ApiPropertyOptional({ description: '가게 ID (가게별 쿠폰인 경우)' })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '자동 적용 여부' })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}

/**
 * 쿠폰 응답 DTO
 */
export class CouponResponseDto {
  @ApiProperty({ description: '쿠폰 ID' })
  id: string;

  @ApiProperty({ description: '쿠폰 이름' })
  name: string;

  @ApiProperty({ description: '쿠폰 설명' })
  description: string;

  @ApiProperty({ description: '쿠폰 코드' })
  code: string;

  @ApiProperty({ enum: CouponType, description: '쿠폰 타입' })
  type: CouponType;

  @ApiProperty({ description: '할인 값' })
  discountValue: number;

  @ApiProperty({ enum: DiscountTarget, description: '할인 적용 대상' })
  target: DiscountTarget;

  @ApiProperty({ enum: CouponStatus, description: '쿠폰 상태' })
  status: CouponStatus;

  @ApiProperty({ description: '유효 시작일' })
  validFrom: Date;

  @ApiProperty({ description: '유효 종료일' })
  validUntil: Date;

  @ApiProperty({ description: '쿠폰 사용 조건', type: CouponConditionDto })
  conditions: CouponConditionDto;

  @ApiPropertyOptional({ description: '가게 ID' })
  restaurantId?: string;

  @ApiProperty({ description: '총 사용 횟수' })
  totalUsedCount: number;

  @ApiProperty({ description: '활성 상태' })
  isActive: boolean;

  @ApiProperty({ description: '자동 적용 여부' })
  autoApply: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

/**
 * 쿠폰 적용 요청 DTO
 */
export class ApplyCouponDto {
  @ApiProperty({ description: '쿠폰 코드' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }) => value?.toUpperCase())
  couponCode: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * 할인 계산 요청 DTO
 */
export class CalculateDiscountDto {
  @ApiProperty({ description: '쿠폰 코드 목록' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  couponCodes: string[];

  @ApiProperty({ description: '주문 총액' })
  @IsNumber()
  @Min(0)
  orderAmount: number;

  @ApiProperty({ description: '배송비' })
  @IsNumber()
  @Min(0)
  deliveryFee: number;

  @ApiProperty({ description: '가게 ID' })
  @IsString()
  restaurantId: string;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * 할인 계산 결과 DTO
 */
export class DiscountCalculationResultDto {
  @ApiProperty({ description: '원본 주문 금액' })
  originalAmount: number;

  @ApiProperty({ description: '총 할인 금액' })
  totalDiscountAmount: number;

  @ApiProperty({ description: '최종 결제 금액' })
  finalAmount: number;

  @ApiProperty({ description: '원본 배송비' })
  originalDeliveryFee: number;

  @ApiProperty({ description: '할인된 배송비' })
  discountedDeliveryFee: number;

  @ApiProperty({ description: '쿠폰 적용 성공 여부' })
  success: boolean;

  @ApiPropertyOptional({ description: '에러 메시지' })
  errorMessage?: string;

  @ApiProperty({ description: '적용된 쿠폰 목록' })
  appliedCoupons: string[];
} 