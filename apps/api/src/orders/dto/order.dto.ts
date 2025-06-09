/**
 * 주문 DTO
 * 
 * 주문 시스템을 위한 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsUUID, IsEnum, IsPositive, Min, Max, ValidateNested, IsDateString, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 주문 상태 열거형
 */
export enum OrderStatus {
  PENDING = 'pending',               // 주문 대기 (결제 대기)
  PAYMENT_CONFIRMED = 'payment_confirmed', // 결제 확인
  ACCEPTED = 'accepted',             // 레스토랑 승인
  PREPARING = 'preparing',           // 조리 중
  READY = 'ready',                   // 조리 완료 (픽업 대기)
  DISPATCHED = 'dispatched',         // 배달 출발
  DELIVERED = 'delivered',           // 배달 완료
  CANCELLED = 'cancelled',           // 주문 취소
  REFUNDED = 'refunded',             // 환불 완료
}

/**
 * 배달 타입 열거형
 */
export enum DeliveryType {
  DELIVERY = 'delivery',             // 배달
  PICKUP = 'pickup',                 // 픽업
}

/**
 * 결제 방법 열거형
 */
export enum PaymentMethod {
  CARD = 'card',                     // 카드 결제
  CASH = 'cash',                     // 현금 결제
  DIGITAL_WALLET = 'digital_wallet', // 디지털 지갑
}

/**
 * 결제 상태 열거형
 */
export enum PaymentStatus {
  PENDING = 'pending',               // 결제 대기
  PROCESSING = 'processing',         // 결제 처리 중
  COMPLETED = 'completed',           // 결제 완료
  FAILED = 'failed',                 // 결제 실패
  CANCELLED = 'cancelled',           // 결제 취소
  REFUNDED = 'refunded',             // 환불 완료
}

/**
 * 배달 주소 DTO
 */
export class DeliveryAddressDto {
  @ApiProperty({ description: '도로명 주소', example: '서울특별시 강남구 테헤란로 123' })
  @IsString({ message: '도로명 주소는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '도로명 주소는 필수입니다.' })
  address: string;

  @ApiPropertyOptional({ description: '상세 주소', example: '101동 1001호' })
  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  addressDetail?: string;

  @ApiPropertyOptional({ description: '우편번호', example: '06234' })
  @IsOptional()
  @IsString({ message: '우편번호는 문자열이어야 합니다.' })
  zipCode?: string;

  @ApiProperty({ description: '위도', example: 37.5665 })
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  latitude: number;

  @ApiProperty({ description: '경도', example: 126.9780 })
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  longitude: number;

  @ApiPropertyOptional({ description: '배달 요청사항', example: '문 앞에 놓아주세요' })
  @IsOptional()
  @IsString({ message: '배달 요청사항은 문자열이어야 합니다.' })
  deliveryInstructions?: string;
}

/**
 * 주문 아이템 DTO
 */
export class OrderItemDto {
  @ApiProperty({ description: '메뉴 아이템 ID', example: 'menu_123' })
  @IsString({ message: '메뉴 아이템 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메뉴 아이템 ID는 필수입니다.' })
  menuItemId: string;

  @ApiProperty({ description: '메뉴명', example: '후라이드 치킨' })
  @IsString({ message: '메뉴명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메뉴명은 필수입니다.' })
  menuName: string;

  @ApiProperty({ description: '수량', example: 2, minimum: 1, maximum: 99 })
  @IsNumber({}, { message: '수량은 숫자여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  @Max(99, { message: '수량은 최대 99개까지 가능합니다.' })
  quantity: number;

  @ApiProperty({ description: '기본 가격 (원)', example: 18000 })
  @IsNumber({}, { message: '기본 가격은 숫자여야 합니다.' })
  @Min(0, { message: '기본 가격은 0 이상이어야 합니다.' })
  basePrice: number;

  @ApiPropertyOptional({ description: '선택된 옵션', type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray({ message: '선택된 옵션은 배열 형태여야 합니다.' })
  selectedOptions?: any[];

  @ApiProperty({ description: '옵션 추가 가격 (원)', example: 2000 })
  @IsNumber({}, { message: '옵션 추가 가격은 숫자여야 합니다.' })
  @Min(0, { message: '옵션 추가 가격은 0 이상이어야 합니다.' })
  optionsPrice: number;

  @ApiProperty({ description: '아이템 총 가격 (원)', example: 40000 })
  @IsNumber({}, { message: '아이템 총 가격은 숫자여야 합니다.' })
  @Min(0, { message: '아이템 총 가격은 0 이상이어야 합니다.' })
  totalPrice: number;

  @ApiPropertyOptional({ description: '특별 요청사항', example: '덜 맵게 해주세요' })
  @IsOptional()
  @IsString({ message: '특별 요청사항은 문자열이어야 합니다.' })
  specialInstructions?: string;
}

/**
 * 주문 생성 요청 DTO
 */
export class CreateOrderDto {
  @ApiProperty({ description: '레스토랑 ID', example: 'rest_123' })
  @IsString({ message: '레스토랑 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '레스토랑 ID는 필수입니다.' })
  restaurantId: string;

  @ApiProperty({ description: '주문 아이템 목록', type: [OrderItemDto] })
  @IsArray({ message: '주문 아이템은 배열 형태여야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: '배달 타입', enum: DeliveryType })
  @IsEnum(DeliveryType, { message: '유효한 배달 타입을 선택해주세요.' })
  deliveryType: DeliveryType;

  @ApiPropertyOptional({ description: '배달 주소', type: DeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiProperty({ description: '결제 방법', enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: '유효한 결제 방법을 선택해주세요.' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: '주문 요청사항', example: '빠른 배달 부탁드립니다' })
  @IsOptional()
  @IsString({ message: '주문 요청사항은 문자열이어야 합니다.' })
  orderNotes?: string;

  @ApiPropertyOptional({ description: '쿠폰 코드', example: 'DISCOUNT10' })
  @IsOptional()
  @IsString({ message: '쿠폰 코드는 문자열이어야 합니다.' })
  couponCode?: string;

  @ApiPropertyOptional({ description: '세션 ID (장바구니 연동)', example: 'session_123' })
  @IsOptional()
  @IsString({ message: '세션 ID는 문자열이어야 합니다.' })
  sessionId?: string;
}

/**
 * 주문 가격 정보 DTO
 */
export class OrderPricingDto {
  @ApiProperty({ description: '메뉴 총 금액 (원)', example: 38000 })
  subtotal: number;

  @ApiProperty({ description: '배달비 (원)', example: 3000 })
  deliveryFee: number;

  @ApiProperty({ description: '서비스 수수료 (원)', example: 500 })
  serviceFee: number;

  @ApiProperty({ description: '할인 금액 (원)', example: 2000 })
  discountAmount: number;

  @ApiProperty({ description: '세금 (원)', example: 1000 })
  tax: number;

  @ApiProperty({ description: '최종 결제 금액 (원)', example: 40500 })
  totalAmount: number;

  @ApiPropertyOptional({ description: '적용된 쿠폰', example: 'DISCOUNT10' })
  appliedCoupon?: string;
}

/**
 * 결제 정보 DTO
 */
export class PaymentInfoDto {
  @ApiProperty({ description: '결제 방법', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ description: '결제 상태', enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional({ description: '결제 거래 ID', example: 'txn_123456' })
  transactionId?: string;

  @ApiPropertyOptional({ description: '결제 승인 번호', example: 'auth_789012' })
  authorizationCode?: string;

  @ApiProperty({ description: '결제 일시', example: '2024-01-15T14:30:00.000Z' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: '결제 실패 사유', example: '카드 한도 초과' })
  failureReason?: string;
}

/**
 * 배달 정보 DTO
 */
export class DeliveryInfoDto {
  @ApiProperty({ description: '배달 타입', enum: DeliveryType })
  type: DeliveryType;

  @ApiPropertyOptional({ description: '배달 주소', type: DeliveryAddressDto })
  @Type(() => DeliveryAddressDto)
  address?: DeliveryAddressDto;

  @ApiProperty({ description: '예상 배달 시간 (분)', example: 35 })
  estimatedTime: number;

  @ApiPropertyOptional({ description: '배달원 ID', example: 'driver_123' })
  driverId?: string;

  @ApiPropertyOptional({ description: '배달원 이름', example: '김배달' })
  driverName?: string;

  @ApiPropertyOptional({ description: '배달원 연락처', example: '010-1234-5678' })
  driverPhone?: string;

  @ApiPropertyOptional({ description: '배달 출발 시간', example: '2024-01-15T15:00:00.000Z' })
  dispatchedAt?: Date;

  @ApiPropertyOptional({ description: '배달 완료 시간', example: '2024-01-15T15:35:00.000Z' })
  deliveredAt?: Date;
}

/**
 * 레스토랑 정보 DTO
 */
export class OrderRestaurantInfoDto {
  @ApiProperty({ description: '레스토랑 ID', example: 'rest_123' })
  id: string;

  @ApiProperty({ description: '레스토랑명', example: '맛있는 치킨집' })
  name: string;

  @ApiProperty({ description: '레스토랑 연락처', example: '02-1234-5678' })
  phone: string;

  @ApiProperty({ description: '레스토랑 주소', example: '서울특별시 강남구 테헤란로 456' })
  address: string;

  @ApiPropertyOptional({ description: '레스토랑 이미지 URL', example: 'https://example.com/restaurant.jpg' })
  imageUrl?: string;
}

/**
 * 주문 응답 DTO
 */
export class OrderResponseDto {
  @ApiProperty({ description: '주문 ID', example: 'order_123' })
  id: string;

  @ApiProperty({ description: '주문 번호', example: 'ORD-20240115-001' })
  orderNumber: string;

  @ApiProperty({ description: '사용자 ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: '레스토랑 정보', type: OrderRestaurantInfoDto })
  @Type(() => OrderRestaurantInfoDto)
  restaurant: OrderRestaurantInfoDto;

  @ApiProperty({ description: '주문 아이템 목록', type: [OrderItemDto] })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: '주문 상태', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: '가격 정보', type: OrderPricingDto })
  @Type(() => OrderPricingDto)
  pricing: OrderPricingDto;

  @ApiProperty({ description: '결제 정보', type: PaymentInfoDto })
  @Type(() => PaymentInfoDto)
  payment: PaymentInfoDto;

  @ApiProperty({ description: '배달 정보', type: DeliveryInfoDto })
  @Type(() => DeliveryInfoDto)
  delivery: DeliveryInfoDto;

  @ApiPropertyOptional({ description: '주문 요청사항', example: '빠른 배달 부탁드립니다' })
  orderNotes?: string;

  @ApiProperty({ description: '주문 일시', example: '2024-01-15T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '마지막 수정 일시', example: '2024-01-15T15:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '주문 취소 사유', example: '고객 요청' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: '예상 조리 완료 시간', example: '2024-01-15T14:25:00.000Z' })
  estimatedReadyTime?: Date;

  @ApiPropertyOptional({ description: '예상 배달 완료 시간', example: '2024-01-15T15:00:00.000Z' })
  estimatedDeliveryTime?: Date;
}

/**
 * 주문 목록 조회 쿼리 DTO
 */
export class OrderListQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '페이지 번호는 숫자여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 아이템 수', example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '페이지당 아이템 수는 숫자여야 합니다.' })
  @Min(1, { message: '페이지당 아이템 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 아이템 수는 100 이하여야 합니다.' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: '주문 상태 필터', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus, { message: '유효한 주문 상태를 선택해주세요.' })
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '시작 날짜', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2024-01-31' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  endDate?: string;

  @ApiPropertyOptional({ description: '레스토랑 ID 필터', example: 'rest_123' })
  @IsOptional()
  @IsString({ message: '레스토랑 ID는 문자열이어야 합니다.' })
  restaurantId?: string;
}

/**
 * 주문 목록 응답 DTO
 */
export class OrderListResponseDto {
  @ApiProperty({ description: '주문 목록', type: [OrderResponseDto] })
  @Type(() => OrderResponseDto)
  orders: OrderResponseDto[];

  @ApiProperty({ description: '총 주문 수', example: 150 })
  totalCount: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  currentPage: number;

  @ApiProperty({ description: '총 페이지 수', example: 15 })
  totalPages: number;

  @ApiProperty({ description: '페이지당 아이템 수', example: 10 })
  limit: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPrevious: boolean;
}

/**
 * 주문 상태 변경 DTO
 */
export class UpdateOrderStatusDto {
  @ApiProperty({ description: '변경할 주문 상태', enum: OrderStatus })
  @IsEnum(OrderStatus, { message: '유효한 주문 상태를 선택해주세요.' })
  status: OrderStatus;

  @ApiPropertyOptional({ description: '상태 변경 사유', example: '고객 요청으로 인한 취소' })
  @IsOptional()
  @IsString({ message: '상태 변경 사유는 문자열이어야 합니다.' })
  reason?: string;

  @ApiPropertyOptional({ description: '예상 시간 업데이트 (분)', example: 30 })
  @IsOptional()
  @IsNumber({}, { message: '예상 시간은 숫자여야 합니다.' })
  @Min(0, { message: '예상 시간은 0 이상이어야 합니다.' })
  estimatedTime?: number;
}

/**
 * 주문 취소 DTO
 */
export class CancelOrderDto {
  @ApiProperty({ description: '취소 사유', example: '고객 변심' })
  @IsString({ message: '취소 사유는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '취소 사유는 필수입니다.' })
  reason: string;

  @ApiPropertyOptional({ description: '환불 요청 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '환불 요청 여부는 불린 값이어야 합니다.' })
  requestRefund?: boolean = true;
}

/**
 * 주문 통계 DTO
 */
export class OrderStatsDto {
  @ApiProperty({ description: '총 주문 수', example: 1250 })
  totalOrders: number;

  @ApiProperty({ description: '완료된 주문 수', example: 1100 })
  completedOrders: number;

  @ApiProperty({ description: '취소된 주문 수', example: 150 })
  cancelledOrders: number;

  @ApiProperty({ description: '평균 주문 금액 (원)', example: 32000 })
  averageOrderValue: number;

  @ApiProperty({ description: '총 매출 (원)', example: 40000000 })
  totalRevenue: number;

  @ApiProperty({ description: '주문 완료율 (%)', example: 88.0 })
  completionRate: number;

  @ApiProperty({ description: '평균 배달 시간 (분)', example: 28 })
  averageDeliveryTime: number;
} 