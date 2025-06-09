/**
 * 장바구니 DTO
 * 
 * 장바구니 시스템을 위한 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsUUID, IsEnum, IsPositive, Min, Max, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 장바구니 아이템 상태 열거형
 */
export enum CartItemStatus {
  ACTIVE = 'active',           // 활성 상태
  UNAVAILABLE = 'unavailable', // 품절/판매 중단
  MODIFIED = 'modified',       // 메뉴 정보 변경됨
}

/**
 * 선택된 메뉴 옵션 DTO
 */
export class SelectedMenuOptionDto {
  @ApiProperty({ description: '옵션 ID', example: 'opt_123' })
  @IsString({ message: '옵션 ID는 문자열이어야 합니다.' })
  optionId: string;

  @ApiProperty({ description: '옵션 그룹 ID', example: 'grp_123' })
  @IsString({ message: '옵션 그룹 ID는 문자열이어야 합니다.' })
  optionGroupId: string;

  @ApiProperty({ description: '옵션명', example: '매운맛' })
  @IsString({ message: '옵션명은 문자열이어야 합니다.' })
  name: string;

  @ApiProperty({ description: '추가 가격 (원)', example: 1000 })
  @IsNumber({}, { message: '추가 가격은 숫자여야 합니다.' })
  @Min(0, { message: '추가 가격은 0 이상이어야 합니다.' })
  additionalPrice: number;

  @ApiPropertyOptional({ description: '재고 수량', example: 10 })
  @IsOptional()
  @IsNumber({}, { message: '재고 수량은 숫자여야 합니다.' })
  @Min(0, { message: '재고 수량은 0 이상이어야 합니다.' })
  stockQuantity?: number;
}

/**
 * 장바구니 아이템 추가 DTO
 */
export class AddCartItemDto {
  @ApiProperty({ description: '메뉴 아이템 ID', example: 'menu_123' })
  @IsString({ message: '메뉴 아이템 ID는 문자열이어야 합니다.' })
  menuItemId: string;

  @ApiProperty({ description: '레스토랑 ID', example: 'rest_123' })
  @IsString({ message: '레스토랑 ID는 문자열이어야 합니다.' })
  restaurantId: string;

  @ApiProperty({ description: '수량', example: 2, minimum: 1, maximum: 99 })
  @IsNumber({}, { message: '수량은 숫자여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  @Max(99, { message: '수량은 최대 99개까지 가능합니다.' })
  @Transform(({ value }) => parseInt(value))
  quantity: number;

  @ApiPropertyOptional({ description: '선택된 옵션 목록', type: [SelectedMenuOptionDto] })
  @IsOptional()
  @IsArray({ message: '선택된 옵션은 배열 형태여야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => SelectedMenuOptionDto)
  selectedOptions?: SelectedMenuOptionDto[];

  @ApiPropertyOptional({ description: '특별 요청사항', example: '덜 맵게 해주세요' })
  @IsOptional()
  @IsString({ message: '특별 요청사항은 문자열이어야 합니다.' })
  @Transform(({ value }) => value?.trim())
  specialInstructions?: string;
}

/**
 * 장바구니 아이템 수정 DTO
 */
export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: '수량', example: 3, minimum: 1, maximum: 99 })
  @IsOptional()
  @IsNumber({}, { message: '수량은 숫자여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  @Max(99, { message: '수량은 최대 99개까지 가능합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  quantity?: number;

  @ApiPropertyOptional({ description: '선택된 옵션 목록', type: [SelectedMenuOptionDto] })
  @IsOptional()
  @IsArray({ message: '선택된 옵션은 배열 형태여야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => SelectedMenuOptionDto)
  selectedOptions?: SelectedMenuOptionDto[];

  @ApiPropertyOptional({ description: '특별 요청사항', example: '매운맛으로 변경해주세요' })
  @IsOptional()
  @IsString({ message: '특별 요청사항은 문자열이어야 합니다.' })
  @Transform(({ value }) => value?.trim())
  specialInstructions?: string;
}

/**
 * 장바구니 아이템 응답 DTO
 */
export class CartItemResponseDto {
  @ApiProperty({ description: '장바구니 아이템 ID', example: 'cart_item_123' })
  id: string;

  @ApiProperty({ description: '메뉴 아이템 ID', example: 'menu_123' })
  menuItemId: string;

  @ApiProperty({ description: '메뉴명', example: '후라이드 치킨' })
  menuName: string;

  @ApiProperty({ description: '메뉴 설명', example: '바삭한 후라이드 치킨' })
  menuDescription: string;

  @ApiProperty({ description: '기본 가격 (원)', example: 18000 })
  basePrice: number;

  @ApiProperty({ description: '수량', example: 2 })
  quantity: number;

  @ApiProperty({ description: '선택된 옵션 목록', type: [SelectedMenuOptionDto] })
  @Type(() => SelectedMenuOptionDto)
  selectedOptions: SelectedMenuOptionDto[];

  @ApiProperty({ description: '옵션 추가 가격 총합 (원)', example: 2000 })
  optionsPrice: number;

  @ApiProperty({ description: '아이템별 총 가격 (원)', example: 40000 })
  totalPrice: number;

  @ApiPropertyOptional({ description: '특별 요청사항', example: '덜 맵게 해주세요' })
  specialInstructions?: string;

  @ApiProperty({ description: '아이템 상태', enum: CartItemStatus })
  status: CartItemStatus;

  @ApiPropertyOptional({ description: '상태 메시지', example: '해당 메뉴가 품절되었습니다.' })
  statusMessage?: string;

  @ApiProperty({ description: '메뉴 이미지 URL', example: 'https://example.com/menu/chicken.jpg' })
  imageUrl: string;

  @ApiProperty({ description: '장바구니 추가 일시', example: '2024-01-15T10:30:00.000Z' })
  addedAt: Date;

  @ApiProperty({ description: '마지막 수정 일시', example: '2024-01-15T11:00:00.000Z' })
  updatedAt: Date;
}

/**
 * 배달 정보 DTO
 */
export class DeliveryInfoDto {
  @ApiProperty({ description: '배달 가능 여부', example: true })
  isAvailable: boolean;

  @ApiProperty({ description: '예상 배달 시간 (분)', example: 35 })
  estimatedTime: number;

  @ApiProperty({ description: '기본 배달비 (원)', example: 3000 })
  baseFee: number;

  @ApiProperty({ description: '거리별 추가 배달비 (원)', example: 500 })
  additionalFee: number;

  @ApiProperty({ description: '총 배달비 (원)', example: 3500 })
  totalFee: number;

  @ApiPropertyOptional({ description: '무료 배달 최소 주문 금액 (원)', example: 20000 })
  freeDeliveryMinAmount?: number;

  @ApiPropertyOptional({ description: '배달 불가 사유', example: '배달 가능 지역을 벗어났습니다.' })
  unavailableReason?: string;
}

/**
 * 할인 정보 DTO
 */
export class DiscountInfoDto {
  @ApiProperty({ description: '할인 ID', example: 'discount_123' })
  id: string;

  @ApiProperty({ description: '할인명', example: '첫 주문 할인' })
  name: string;

  @ApiProperty({ description: '할인 유형', example: 'percentage' })
  type: 'percentage' | 'fixed' | 'free_delivery';

  @ApiProperty({ description: '할인 값', example: 10 })
  value: number;

  @ApiProperty({ description: '할인 금액 (원)', example: 2000 })
  discountAmount: number;

  @ApiProperty({ description: '최소 주문 금액 (원)', example: 15000 })
  minOrderAmount: number;

  @ApiPropertyOptional({ description: '최대 할인 금액 (원)', example: 5000 })
  maxDiscountAmount?: number;

  @ApiProperty({ description: '할인 설명', example: '첫 주문 시 10% 할인 (최대 5,000원)' })
  description: string;
}

/**
 * 가격 계산 결과 DTO
 */
export class PriceCalculationDto {
  @ApiProperty({ description: '메뉴 총 금액 (원)', example: 38000 })
  subtotal: number;

  @ApiProperty({ description: '배달비 (원)', example: 3000 })
  deliveryFee: number;

  @ApiProperty({ description: '할인 금액 (원)', example: 2000 })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액 (원)', example: 39000 })
  totalAmount: number;

  @ApiProperty({ description: '적용된 할인 목록', type: [DiscountInfoDto] })
  @Type(() => DiscountInfoDto)
  appliedDiscounts: DiscountInfoDto[];

  @ApiPropertyOptional({ description: '무료 배달까지 남은 금액 (원)', example: 2000 })
  amountForFreeDelivery?: number;
}

/**
 * 레스토랑 정보 요약 DTO
 */
export class RestaurantSummaryDto {
  @ApiProperty({ description: '레스토랑 ID', example: 'rest_123' })
  id: string;

  @ApiProperty({ description: '레스토랑명', example: '맛있는 치킨집' })
  name: string;

  @ApiProperty({ description: '레스토랑 이미지 URL', example: 'https://example.com/restaurant.jpg' })
  imageUrl: string;

  @ApiProperty({ description: '최소 주문 금액 (원)', example: 15000 })
  minimumOrderAmount: number;

  @ApiProperty({ description: '영업 상태', example: '영업 중' })
  businessStatus: string;

  @ApiProperty({ description: '평균 조리 시간 (분)', example: 25 })
  preparationTime: number;
}

/**
 * 장바구니 응답 DTO
 */
export class CartResponseDto {
  @ApiProperty({ description: '장바구니 ID', example: 'cart_123' })
  id: string;

  @ApiProperty({ description: '레스토랑 정보', type: RestaurantSummaryDto })
  @Type(() => RestaurantSummaryDto)
  restaurant: RestaurantSummaryDto;

  @ApiProperty({ description: '장바구니 아이템 목록', type: [CartItemResponseDto] })
  @Type(() => CartItemResponseDto)
  items: CartItemResponseDto[];

  @ApiProperty({ description: '총 아이템 수', example: 3 })
  totalItems: number;

  @ApiProperty({ description: '총 수량', example: 5 })
  totalQuantity: number;

  @ApiProperty({ description: '가격 계산 정보', type: PriceCalculationDto })
  @Type(() => PriceCalculationDto)
  pricing: PriceCalculationDto;

  @ApiProperty({ description: '배달 정보', type: DeliveryInfoDto })
  @Type(() => DeliveryInfoDto)
  delivery: DeliveryInfoDto;

  @ApiProperty({ description: '장바구니 생성 일시', example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '마지막 수정 일시', example: '2024-01-15T11:30:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ description: '주문 가능 여부', example: true })
  canOrder: boolean;

  @ApiPropertyOptional({ description: '주문 불가 사유', example: '최소 주문 금액에 미달합니다.' })
  orderBlockReason?: string;
}

/**
 * 장바구니 검증 결과 DTO
 */
export class CartValidationDto {
  @ApiProperty({ description: '검증 성공 여부', example: true })
  isValid: boolean;

  @ApiProperty({ description: '주문 가능 여부', example: true })
  canProceedToOrder: boolean;

  @ApiProperty({ description: '검증 메시지 목록', type: [String] })
  messages: string[];

  @ApiProperty({ description: '경고 메시지 목록', type: [String] })
  warnings: string[];

  @ApiProperty({ description: '변경된 아이템 목록', type: [String] })
  changedItems: string[];

  @ApiProperty({ description: '품절된 아이템 목록', type: [String] })
  unavailableItems: string[];

  @ApiProperty({ description: '검증 수행 일시', example: '2024-01-15T12:00:00.000Z' })
  validatedAt: Date;
}

/**
 * 빠른 재주문 DTO
 */
export class QuickReorderDto {
  @ApiProperty({ description: '주문 ID', example: 'order_123' })
  @IsString({ message: '주문 ID는 문자열이어야 합니다.' })
  orderId: string;

  @ApiPropertyOptional({ description: '품절 아이템 제외 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '품절 아이템 제외 여부는 불린 값이어야 합니다.' })
  excludeUnavailable?: boolean = true;

  @ApiPropertyOptional({ description: '수량 조정 여부', example: false })
  @IsOptional()
  @IsBoolean({ message: '수량 조정 여부는 불린 값이어야 합니다.' })
  adjustQuantity?: boolean = false;
}

/**
 * 장바구니 통계 DTO
 */
export class CartStatsDto {
  @ApiProperty({ description: '총 방문 횟수', example: 15 })
  totalVisits: number;

  @ApiProperty({ description: '평균 장바구니 금액 (원)', example: 32000 })
  averageCartValue: number;

  @ApiProperty({ description: '가장 많이 주문한 메뉴', example: '후라이드 치킨' })
  favoriteMenuItem: string;

  @ApiProperty({ description: '평균 주문 완료 시간 (분)', example: 8 })
  averageOrderTime: number;

  @ApiProperty({ description: '장바구니 포기율 (%)', example: 23.5 })
  abandonmentRate: number;
} 