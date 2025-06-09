/**
 * 간편결제 연동 DTO
 * 
 * 카카오페이, 토스페이, 네이버페이 등 주요 PG사와의 연동을 위한 데이터 구조를 정의합니다.
 */

import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  IsBoolean, 
  IsDateString,
  IsUrl,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 지원하는 PG사 열거형
 */
export enum PaymentGateway {
  KAKAOPAY = 'kakaopay',
  TOSS = 'toss',
  NAVERPAY = 'naverpay',
  PAYCO = 'payco',
  SAMSUNGPAY = 'samsungpay',
  LGPAY = 'lgpay'
}

/**
 * 결제 상태 열거형
 */
export enum PaymentGatewayStatus {
  PENDING = 'pending',           // 결제 대기
  APPROVED = 'approved',         // 결제 승인
  READY = 'ready',              // 결제 준비
  CANCELLED = 'cancelled',       // 결제 취소
  FAILED = 'failed',            // 결제 실패
  PARTIAL_CANCELLED = 'partial_cancelled', // 부분 취소
  REFUNDED = 'refunded'         // 환불 완료
}

/**
 * 결제 방법 열거형
 */
export enum PaymentMethod {
  CARD = 'card',               // 신용카드
  BANK_TRANSFER = 'bank_transfer', // 계좌이체
  VIRTUAL_ACCOUNT = 'virtual_account', // 가상계좌
  MOBILE = 'mobile',           // 휴대폰 결제
  GIFT_CARD = 'gift_card'      // 상품권
}

/**
 * 결제 요청 기본 DTO
 */
export class PaymentGatewayRequestDto {
  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ description: '상품명' })
  @IsString()
  itemName: string;

  @ApiProperty({ enum: PaymentGateway, description: 'PG사' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentMethod, description: '결제 방법' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: '구매자 ID' })
  @IsString()
  buyerId: string;

  @ApiProperty({ description: '구매자 이름' })
  @IsString()
  buyerName: string;

  @ApiProperty({ description: '구매자 이메일' })
  @IsString()
  buyerEmail: string;

  @ApiProperty({ description: '구매자 전화번호' })
  @IsString()
  buyerPhone: string;

  @ApiPropertyOptional({ description: '성공 리다이렉트 URL' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({ description: '실패 리다이렉트 URL' })
  @IsOptional()
  @IsUrl()
  failUrl?: string;

  @ApiPropertyOptional({ description: '취소 리다이렉트 URL' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: '추가 정보' })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 카카오페이 결제 요청 DTO
 */
export class KakaoPayRequestDto extends PaymentGatewayRequestDto {
  @ApiProperty({ description: '가맹점 코드' })
  @IsString()
  cid: string;

  @ApiPropertyOptional({ description: '정기결제 CID' })
  @IsOptional()
  @IsString()
  cidSecret?: string;

  @ApiPropertyOptional({ description: '할부 개월 수' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  installMonth?: number;

  @ApiPropertyOptional({ description: '모바일 웹 여부' })
  @IsOptional()
  @IsBoolean()
  mobileWeb?: boolean;
}

/**
 * 토스 결제 요청 DTO
 */
export class TossPaymentRequestDto extends PaymentGatewayRequestDto {
  @ApiProperty({ description: '클라이언트 키' })
  @IsString()
  clientKey: string;

  @ApiPropertyOptional({ description: '카드 회사 코드' })
  @IsOptional()
  @IsString()
  cardCompany?: string;

  @ApiPropertyOptional({ description: '할부 개월 수' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  installmentMonths?: number;

  @ApiPropertyOptional({ description: '카드 할인 금액' })
  @IsOptional()
  @IsNumber()
  cardDiscount?: number;
}

/**
 * 네이버페이 결제 요청 DTO
 */
export class NaverPayRequestDto extends PaymentGatewayRequestDto {
  @ApiProperty({ description: '가맹점 ID' })
  @IsString()
  merchantId: string;

  @ApiPropertyOptional({ description: '상품 카테고리' })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiPropertyOptional({ description: '배송비' })
  @IsOptional()
  @IsNumber()
  shippingFee?: number;

  @ApiPropertyOptional({ description: '네이버페이 포인트 사용 여부' })
  @IsOptional()
  @IsBoolean()
  useNaverPoint?: boolean;
}

/**
 * 결제 응답 기본 DTO
 */
export class PaymentGatewayResponseDto {
  @ApiProperty({ description: '결제 고유 ID' })
  paymentId: string;

  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ enum: PaymentGatewayStatus, description: '결제 상태' })
  status: PaymentGatewayStatus;

  @ApiProperty({ description: '결제 금액' })
  amount: number;

  @ApiProperty({ enum: PaymentGateway, description: 'PG사' })
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentMethod, description: '결제 방법' })
  method: PaymentMethod;

  @ApiPropertyOptional({ description: '승인 번호' })
  approvalNumber?: string;

  @ApiPropertyOptional({ description: '카드 정보' })
  cardInfo?: CardInfo;

  @ApiPropertyOptional({ description: '은행 정보' })
  bankInfo?: BankInfo;

  @ApiProperty({ description: '결제 요청 시간' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: '결제 승인 시간' })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: '오류 메시지' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: '결제 URL (리다이렉트용)' })
  paymentUrl?: string;

  @ApiProperty({ description: '추가 정보' })
  metadata?: Record<string, any>;
}

/**
 * 카드 정보 인터페이스
 */
export interface CardInfo {
  cardCompany: string;      // 카드사
  cardNumber: string;       // 마스킹된 카드번호
  cardType: string;         // 카드 유형 (신용/체크)
  installmentMonths?: number; // 할부 개월
  approvalNumber?: string;  // 승인번호
  acquirerCode?: string;    // 매입사 코드
}

/**
 * 은행 정보 인터페이스
 */
export interface BankInfo {
  bankCode: string;         // 은행 코드
  bankName: string;         // 은행명
  accountNumber?: string;   // 마스킹된 계좌번호
  holderName?: string;      // 예금주명
}

/**
 * 결제 취소/환불 요청 DTO
 */
export class PaymentCancelRequestDto {
  @ApiProperty({ description: '결제 ID' })
  @IsString()
  paymentId: string;

  @ApiPropertyOptional({ description: '취소 금액 (부분 취소 시)' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  cancelAmount?: number;

  @ApiProperty({ description: '취소 사유' })
  @IsString()
  cancelReason: string;

  @ApiPropertyOptional({ description: '환불 계좌 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RefundAccountDto)
  refundAccount?: RefundAccountDto;
}

/**
 * 환불 계좌 정보 DTO
 */
export class RefundAccountDto {
  @ApiProperty({ description: '은행 코드' })
  @IsString()
  bankCode: string;

  @ApiProperty({ description: '계좌번호' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: '예금주명' })
  @IsString()
  holderName: string;
}

/**
 * 웹훅 데이터 DTO
 */
export class PaymentWebhookDto {
  @ApiProperty({ description: '이벤트 타입' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: '결제 ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: PaymentGatewayStatus, description: '결제 상태' })
  @IsEnum(PaymentGatewayStatus)
  status: PaymentGatewayStatus;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentGateway, description: 'PG사' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ description: '웹훅 수신 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '서명값 (보안 검증용)' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ description: '웹훅 데이터' })
  data: any;
}

/**
 * 결제 상태 조회 응답 DTO
 */
export class PaymentStatusResponseDto {
  @ApiProperty({ description: '결제 ID' })
  paymentId: string;

  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ enum: PaymentGatewayStatus, description: '현재 상태' })
  status: PaymentGatewayStatus;

  @ApiProperty({ description: '원본 결제 금액' })
  totalAmount: number;

  @ApiProperty({ description: '취소된 금액' })
  cancelledAmount: number;

  @ApiProperty({ description: '잔여 금액' })
  remainingAmount: number;

  @ApiProperty({ description: '결제 이력', type: [Object] })
  history: PaymentHistoryItem[];

  @ApiProperty({ description: '마지막 업데이트 시간' })
  lastUpdated: Date;
}

/**
 * 결제 이력 아이템 인터페이스
 */
export interface PaymentHistoryItem {
  action: string;           // 액션 타입 (payment, cancel, refund)
  amount: number;           // 금액
  status: PaymentGatewayStatus; // 상태
  timestamp: Date;          // 시간
  reason?: string;          // 사유
  metadata?: any;           // 추가 정보
}

/**
 * 정기결제 등록 요청 DTO
 */
export class RecurringPaymentRequestDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: PaymentGateway, description: 'PG사' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ description: '카드 정보' })
  @ValidateNested()
  @Type(() => CardRegistrationDto)
  cardInfo: CardRegistrationDto;

  @ApiPropertyOptional({ description: '빌링키 (기존 등록된 카드)' })
  @IsOptional()
  @IsString()
  billingKey?: string;
}

/**
 * 카드 등록 정보 DTO
 */
export class CardRegistrationDto {
  @ApiProperty({ description: '카드번호' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ description: '유효기간 (YYMM)' })
  @IsString()
  expiryDate: string;

  @ApiProperty({ description: '생년월일 또는 사업자번호 (6자리/10자리)' })
  @IsString()
  birthOrBusinessNumber: string;

  @ApiPropertyOptional({ description: 'CVC (선택)' })
  @IsOptional()
  @IsString()
  cvc?: string;

  @ApiPropertyOptional({ description: '비밀번호 앞 2자리' })
  @IsOptional()
  @IsString()
  password?: string;
}

/**
 * 정기결제 실행 요청 DTO
 */
export class RecurringPaymentExecuteDto {
  @ApiProperty({ description: '빌링키' })
  @IsString()
  billingKey: string;

  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ description: '상품명' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ description: '할부 개월 수' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  installmentMonths?: number;
} 