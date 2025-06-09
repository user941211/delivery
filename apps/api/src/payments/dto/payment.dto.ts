/**
 * 결제 DTO
 * 
 * 토스페이먼츠 API와 결제 프로세스를 위한 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsEnum, IsPositive, Min, Max, ValidateNested, IsDateString, IsNotEmpty, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 결제 방법 열거형
 */
export enum TossPaymentMethod {
  CARD = '카드',                      // 신용카드/체크카드
  VIRTUAL_ACCOUNT = '가상계좌',       // 가상계좌
  SIMPLE_PAY = '간편결제',            // 간편결제 (페이코, 카카오페이 등)
  MOBILE_PHONE = '휴대폰',            // 휴대폰 결제
  ACCOUNT_TRANSFER = '계좌이체',       // 실시간 계좌이체
  CULTURE_GIFT_CARD = '문화상품권',    // 문화상품권
  BOOK_GIFT_CARD = '도서문화상품권',   // 도서문화상품권
  GAME_GIFT_CARD = '게임문화상품권',   // 게임문화상품권
}

/**
 * 결제 상태 열거형
 */
export enum TossPaymentStatus {
  READY = 'READY',                   // 결제 대기 중
  IN_PROGRESS = 'IN_PROGRESS',       // 결제 진행 중
  WAITING_FOR_DEPOSIT = 'WAITING_FOR_DEPOSIT', // 입금 대기 중 (가상계좌)
  DONE = 'DONE',                     // 결제 완료
  CANCELED = 'CANCELED',             // 결제 취소
  PARTIAL_CANCELED = 'PARTIAL_CANCELED', // 부분 취소
  ABORTED = 'ABORTED',               // 결제 승인 실패
  EXPIRED = 'EXPIRED',               // 결제 만료
}

/**
 * 토스페이먼츠 카드 정보 DTO
 */
export class TossCardDto {
  @ApiProperty({ description: '카드사 숫자 코드', example: '361' })
  @IsString({ message: '카드사 코드는 문자열이어야 합니다.' })
  company: string;

  @ApiProperty({ description: '카드 번호 (일부 마스킹)', example: '433012******1234' })
  @IsString({ message: '카드 번호는 문자열이어야 합니다.' })
  number: string;

  @ApiProperty({ description: '할부 개월 수', example: 0 })
  @IsNumber({}, { message: '할부 개월 수는 숫자여야 합니다.' })
  installmentPlanMonths: number;

  @ApiProperty({ description: '카드 타입', example: '신용' })
  @IsString({ message: '카드 타입은 문자열이어야 합니다.' })
  cardType: string;

  @ApiProperty({ description: '카드 소유자 타입', example: '개인' })
  @IsString({ message: '카드 소유자 타입은 문자열이어야 합니다.' })
  ownerType: string;

  @ApiProperty({ description: '무이자 할부 여부', example: false })
  @IsBoolean({ message: '무이자 할부 여부는 불린 값이어야 합니다.' })
  isInterestFree: boolean;

  @ApiProperty({ description: '간편결제 타입', example: null })
  @IsOptional()
  @IsString({ message: '간편결제 타입은 문자열이어야 합니다.' })
  acquireStatus?: string;
}

/**
 * 토스페이먼츠 가상계좌 정보 DTO
 */
export class TossVirtualAccountDto {
  @ApiProperty({ description: '가상계좌 타입', example: '일반' })
  @IsString({ message: '가상계좌 타입은 문자열이어야 합니다.' })
  accountType: string;

  @ApiProperty({ description: '가상계좌 번호', example: '70015405938404' })
  @IsString({ message: '가상계좌 번호는 문자열이어야 합니다.' })
  accountNumber: string;

  @ApiProperty({ description: '은행 코드', example: '20' })
  @IsString({ message: '은행 코드는 문자열이어야 합니다.' })
  bankCode: string;

  @ApiProperty({ description: '고객명', example: '김토스' })
  @IsString({ message: '고객명은 문자열이어야 합니다.' })
  customerName: string;

  @ApiProperty({ description: '입금 기한', example: '2024-01-16T23:59:59+09:00' })
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  dueDate: string;

  @ApiProperty({ description: '정산 상태', example: 'INCOMPLETED' })
  @IsString({ message: '정산 상태는 문자열이어야 합니다.' })
  settlementStatus: string;

  @ApiProperty({ description: '환불 상태', example: 'NONE' })
  @IsString({ message: '환불 상태는 문자열이어야 합니다.' })
  refundStatus: string;
}

/**
 * 토스페이먼츠 간편결제 정보 DTO
 */
export class TossEasyPayDto {
  @ApiProperty({ description: '간편결제 제공사', example: 'KAKAOPAY' })
  @IsString({ message: '간편결제 제공사는 문자열이어야 합니다.' })
  provider: string;

  @ApiProperty({ description: '간편결제 금액', example: 25000 })
  @IsNumber({}, { message: '간편결제 금액은 숫자여야 합니다.' })
  amount: number;

  @ApiProperty({ description: '할인 금액', example: 1000 })
  @IsNumber({}, { message: '할인 금액은 숫자여야 합니다.' })
  discountAmount: number;
}

/**
 * 토스페이먼츠 취소 정보 DTO
 */
export class TossCancelDto {
  @ApiProperty({ description: '취소 금액', example: 20000 })
  @IsNumber({}, { message: '취소 금액은 숫자여야 합니다.' })
  cancelAmount: number;

  @ApiProperty({ description: '취소 사유', example: '고객 변심' })
  @IsString({ message: '취소 사유는 문자열이어야 합니다.' })
  cancelReason: string;

  @ApiProperty({ description: '취소 날짜', example: '2024-01-16T10:15:30+09:00' })
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  canceledAt: string;

  @ApiProperty({ description: '취소 거래 키', example: '5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6' })
  @IsString({ message: '취소 거래 키는 문자열이어야 합니다.' })
  transactionKey: string;
}

/**
 * 결제 요청 DTO
 */
export class CreatePaymentDto {
  @ApiProperty({ description: '주문 ID', example: 'order_123456' })
  @IsString({ message: '주문 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '주문 ID는 필수입니다.' })
  orderId: string;

  @ApiProperty({ description: '결제 금액', example: 25000, minimum: 100 })
  @IsNumber({}, { message: '결제 금액은 숫자여야 합니다.' })
  @IsPositive({ message: '결제 금액은 양수여야 합니다.' })
  @Min(100, { message: '결제 금액은 최소 100원 이상이어야 합니다.' })
  amount: number;

  @ApiProperty({ description: '주문명', example: '맛있는 치킨 주문' })
  @IsString({ message: '주문명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '주문명은 필수입니다.' })
  orderName: string;

  @ApiProperty({ description: '고객 이메일', example: 'customer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @IsNotEmpty({ message: '고객 이메일은 필수입니다.' })
  customerEmail: string;

  @ApiProperty({ description: '고객명', example: '김고객' })
  @IsString({ message: '고객명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '고객명은 필수입니다.' })
  customerName: string;

  @ApiPropertyOptional({ description: '고객 전화번호', example: '010-1234-5678' })
  @IsOptional()
  @IsPhoneNumber('KR', { message: '올바른 한국 전화번호 형식을 입력해주세요.' })
  customerMobilePhone?: string;

  @ApiProperty({ description: '결제 방법', enum: TossPaymentMethod })
  @IsEnum(TossPaymentMethod, { message: '유효한 결제 방법을 선택해주세요.' })
  method: TossPaymentMethod;

  @ApiProperty({ description: '성공 시 리다이렉트 URL', example: 'https://example.com/success' })
  @IsString({ message: '성공 URL은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '성공 URL은 필수입니다.' })
  successUrl: string;

  @ApiProperty({ description: '실패 시 리다이렉트 URL', example: 'https://example.com/fail' })
  @IsString({ message: '실패 URL은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '실패 URL은 필수입니다.' })
  failUrl: string;

  @ApiPropertyOptional({ description: '결제 창 표시 언어', example: 'ko_KR' })
  @IsOptional()
  @IsString({ message: '언어 코드는 문자열이어야 합니다.' })
  locale?: string;

  @ApiPropertyOptional({ description: '가상계좌 입금 기한 (분)', example: 1440 })
  @IsOptional()
  @IsNumber({}, { message: '입금 기한은 숫자여야 합니다.' })
  @Min(1, { message: '입금 기한은 최소 1분 이상이어야 합니다.' })
  @Max(60 * 24 * 30, { message: '입금 기한은 최대 30일까지 가능합니다.' })
  validHours?: number;

  @ApiPropertyOptional({ description: '카드 무이자 할부 개월 수', example: [0, 2, 3] })
  @IsOptional()
  @IsArray({ message: '할부 개월은 배열 형태여야 합니다.' })
  cardInstallmentPlan?: number[];

  @ApiPropertyOptional({ description: '최대 할부 개월 수', example: 12 })
  @IsOptional()
  @IsNumber({}, { message: '최대 할부 개월은 숫자여야 합니다.' })
  @Min(2, { message: '최대 할부 개월은 최소 2개월 이상이어야 합니다.' })
  @Max(36, { message: '최대 할부 개월은 최대 36개월까지 가능합니다.' })
  maxCardInstallmentPlan?: number;
}

/**
 * 결제 승인 요청 DTO
 */
export class ConfirmPaymentDto {
  @ApiProperty({ description: '결제 키', example: '5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6' })
  @IsString({ message: '결제 키는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '결제 키는 필수입니다.' })
  paymentKey: string;

  @ApiProperty({ description: '주문 ID', example: 'order_123456' })
  @IsString({ message: '주문 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '주문 ID는 필수입니다.' })
  orderId: string;

  @ApiProperty({ description: '결제 금액', example: 25000 })
  @IsNumber({}, { message: '결제 금액은 숫자여야 합니다.' })
  @IsPositive({ message: '결제 금액은 양수여야 합니다.' })
  amount: number;
}

/**
 * 결제 취소 요청 DTO
 */
export class CancelPaymentDto {
  @ApiProperty({ description: '취소 사유', example: '고객 변심' })
  @IsString({ message: '취소 사유는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '취소 사유는 필수입니다.' })
  cancelReason: string;

  @ApiPropertyOptional({ description: '취소 금액 (부분 취소 시)', example: 10000 })
  @IsOptional()
  @IsNumber({}, { message: '취소 금액은 숫자여야 합니다.' })
  @IsPositive({ message: '취소 금액은 양수여야 합니다.' })
  cancelAmount?: number;

  @ApiPropertyOptional({ description: '환불받을 계좌 은행', example: '하나' })
  @IsOptional()
  @IsString({ message: '환불 계좌 은행은 문자열이어야 합니다.' })
  refundReceiveAccount?: string;

  @ApiPropertyOptional({ description: '환불받을 계좌 번호', example: '12345678901234' })
  @IsOptional()
  @IsString({ message: '환불 계좌 번호는 문자열이어야 합니다.' })
  refundReceiveAccountNumber?: string;

  @ApiPropertyOptional({ description: '환불받을 계좌 예금주', example: '김고객' })
  @IsOptional()
  @IsString({ message: '환불 계좌 예금주는 문자열이어야 합니다.' })
  refundReceiveAccountHolderName?: string;
}

/**
 * 토스페이먼츠 응답 DTO
 */
export class TossPaymentResponseDto {
  @ApiProperty({ description: '토스페이먼츠 버전', example: '2022-11-16' })
  version: string;

  @ApiProperty({ description: '결제 키', example: '5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6' })
  paymentKey: string;

  @ApiProperty({ description: '결제 타입', example: 'NORMAL' })
  type: string;

  @ApiProperty({ description: '주문 ID', example: 'order_123456' })
  orderId: string;

  @ApiProperty({ description: '주문명', example: '맛있는 치킨 주문' })
  orderName: string;

  @ApiProperty({ description: 'MID', example: 'tosspayments' })
  mId: string;

  @ApiProperty({ description: '통화', example: 'KRW' })
  currency: string;

  @ApiProperty({ description: '결제 방법', example: '카드' })
  method: string;

  @ApiProperty({ description: '총 결제 금액', example: 25000 })
  totalAmount: number;

  @ApiProperty({ description: '잔액', example: 25000 })
  balanceAmount: number;

  @ApiProperty({ description: '결제 상태', enum: TossPaymentStatus })
  status: TossPaymentStatus;

  @ApiProperty({ description: '결제 요청 일시', example: '2024-01-15T14:00:00+09:00' })
  requestedAt: string;

  @ApiProperty({ description: '결제 승인 일시', example: '2024-01-15T14:02:30+09:00' })
  approvedAt?: string;

  @ApiProperty({ description: '결제 영수증 URL', example: 'https://dashboard.tosspayments.com/receipt/5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6' })
  receipt?: {
    url: string;
  };

  @ApiProperty({ description: '결제 실패 정보' })
  failure?: {
    code: string;
    message: string;
  };

  @ApiPropertyOptional({ description: '카드 정보', type: TossCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TossCardDto)
  card?: TossCardDto;

  @ApiPropertyOptional({ description: '가상계좌 정보', type: TossVirtualAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TossVirtualAccountDto)
  virtualAccount?: TossVirtualAccountDto;

  @ApiPropertyOptional({ description: '간편결제 정보', type: TossEasyPayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TossEasyPayDto)
  easyPay?: TossEasyPayDto;

  @ApiPropertyOptional({ description: '취소 정보', type: [TossCancelDto] })
  @IsOptional()
  @IsArray({ message: '취소 정보는 배열 형태여야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => TossCancelDto)
  cancels?: TossCancelDto[];

  @ApiPropertyOptional({ description: '할인 정보' })
  discount?: {
    amount: number;
  };

  @ApiPropertyOptional({ description: '카드 프로모션 정보' })
  cardPromotion?: any;

  @ApiPropertyOptional({ description: '현금영수증 정보' })
  cashReceipt?: {
    type: string;
    receiptKey: string;
    issueNumber: string;
    receiptUrl: string;
    amount: number;
    taxFreeAmount: number;
  };

  @ApiPropertyOptional({ description: '에스크로 정보' })
  escrow?: {
    company: string;
    invoice: {
      invoiceNumber: string;
      invoiceUrl: string;
    };
  };
}

/**
 * 결제 이력 조회 쿼리 DTO
 */
export class PaymentHistoryQueryDto {
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

  @ApiPropertyOptional({ description: '결제 상태 필터', enum: TossPaymentStatus })
  @IsOptional()
  @IsEnum(TossPaymentStatus, { message: '유효한 결제 상태를 선택해주세요.' })
  status?: TossPaymentStatus;

  @ApiPropertyOptional({ description: '결제 방법 필터', enum: TossPaymentMethod })
  @IsOptional()
  @IsEnum(TossPaymentMethod, { message: '유효한 결제 방법을 선택해주세요.' })
  method?: TossPaymentMethod;

  @ApiPropertyOptional({ description: '시작 날짜', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2024-01-31' })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식을 입력해주세요.' })
  endDate?: string;
}

/**
 * 결제 이력 응답 DTO
 */
export class PaymentHistoryResponseDto {
  @ApiProperty({ description: '결제 이력 목록', type: [TossPaymentResponseDto] })
  @Type(() => TossPaymentResponseDto)
  payments: TossPaymentResponseDto[];

  @ApiProperty({ description: '총 결제 건수', example: 150 })
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
 * 결제 통계 DTO
 */
export class PaymentStatsDto {
  @ApiProperty({ description: '총 결제 건수', example: 1250 })
  totalPayments: number;

  @ApiProperty({ description: '성공한 결제 건수', example: 1180 })
  successfulPayments: number;

  @ApiProperty({ description: '실패한 결제 건수', example: 70 })
  failedPayments: number;

  @ApiProperty({ description: '취소된 결제 건수', example: 45 })
  canceledPayments: number;

  @ApiProperty({ description: '총 결제 금액 (원)', example: 52000000 })
  totalAmount: number;

  @ApiProperty({ description: '평균 결제 금액 (원)', example: 44068 })
  averageAmount: number;

  @ApiProperty({ description: '결제 성공률 (%)', example: 94.4 })
  successRate: number;

  @ApiProperty({ description: '카드 결제 비율 (%)', example: 78.5 })
  cardPaymentRate: number;

  @ApiProperty({ description: '간편결제 비율 (%)', example: 15.2 })
  easyPayRate: number;

  @ApiProperty({ description: '가상계좌 결제 비율 (%)', example: 6.3 })
  virtualAccountRate: number;
} 