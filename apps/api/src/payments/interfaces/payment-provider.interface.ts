/**
 * 결제 제공업체 인터페이스
 * 
 * 토스페이먼츠 등 결제 서비스와의 연동을 위한 인터페이스를 정의합니다.
 */

import { 
  CreatePaymentDto, 
  ConfirmPaymentDto, 
  CancelPaymentDto, 
  TossPaymentResponseDto,
  PaymentHistoryQueryDto,
  PaymentHistoryResponseDto 
} from '../dto/payment.dto';

/**
 * 결제 제공업체 인터페이스
 * 다양한 결제 서비스 (토스페이먼츠, 아임포트 등)를 지원하기 위한 공통 인터페이스
 */
export interface PaymentProviderInterface {
  /**
   * 결제 요청 생성
   * 고객이 결제를 시작할 때 결제 정보를 생성하고 결제 페이지 URL을 반환합니다.
   */
  createPayment(createPaymentDto: CreatePaymentDto): Promise<{
    paymentKey: string;
    checkoutUrl: string;
    orderId: string;
    amount: number;
  }>;

  /**
   * 결제 승인 처리
   * 고객이 결제를 완료한 후 결제를 최종 승인합니다.
   */
  confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<TossPaymentResponseDto>;

  /**
   * 결제 취소/환불 처리
   * 결제 완료된 건에 대해 전체 또는 부분 취소를 진행합니다.
   */
  cancelPayment(paymentKey: string, cancelPaymentDto: CancelPaymentDto): Promise<TossPaymentResponseDto>;

  /**
   * 결제 정보 조회
   * 결제 키로 특정 결제의 상세 정보를 조회합니다.
   */
  getPayment(paymentKey: string): Promise<TossPaymentResponseDto>;

  /**
   * 주문 ID로 결제 정보 조회
   * 주문 ID로 해당 주문의 결제 정보를 조회합니다.
   */
  getPaymentByOrderId(orderId: string): Promise<TossPaymentResponseDto>;

  /**
   * 결제 이력 조회
   * 특정 조건으로 결제 이력을 조회합니다. (관리자용)
   */
  getPaymentHistory?(queryDto: PaymentHistoryQueryDto): Promise<PaymentHistoryResponseDto>;

  /**
   * 웹훅 서명 검증
   * 결제 서비스에서 전송하는 웹훅의 서명을 검증합니다.
   */
  verifyWebhookSignature(signature: string, payload: string): boolean;

  /**
   * 결제 상태 동기화
   * 결제 서비스의 실제 상태와 로컬 데이터베이스 상태를 동기화합니다.
   */
  syncPaymentStatus?(paymentKey: string): Promise<TossPaymentResponseDto>;
}

/**
 * 토스페이먼츠 API 설정 인터페이스
 */
export interface TossPaymentsConfig {
  /** 클라이언트 키 (공개 키) */
  clientKey: string;
  
  /** 시크릿 키 (서버용 비밀 키) */
  secretKey: string;
  
  /** API 기본 URL */
  baseUrl: string;
  
  /** 테스트 모드 여부 */
  isTestMode: boolean;
  
  /** 웹훅 엔드포인트 URL */
  webhookEndpointSecret?: string;
}

/**
 * 결제 프로세스 상태 열거형
 */
export enum PaymentProcessStatus {
  /** 결제 요청 생성됨 */
  CREATED = 'created',
  
  /** 고객이 결제 진행 중 */
  PENDING = 'pending',
  
  /** 결제 승인 완료 */
  CONFIRMED = 'confirmed',
  
  /** 결제 실패 */
  FAILED = 'failed',
  
  /** 결제 취소됨 */
  CANCELLED = 'cancelled',
  
  /** 부분 취소됨 */
  PARTIAL_CANCELLED = 'partial_cancelled',
  
  /** 환불 완료됨 */
  REFUNDED = 'refunded',
}

/**
 * 결제 이벤트 타입 열거형
 */
export enum PaymentEventType {
  /** 결제 성공 */
  PAYMENT_CONFIRMED = 'payment.confirmed',
  
  /** 결제 실패 */
  PAYMENT_FAILED = 'payment.failed',
  
  /** 가상계좌 입금 완료 */
  VIRTUAL_ACCOUNT_DEPOSIT = 'virtualAccount.deposit',
  
  /** 결제 취소 */
  PAYMENT_CANCELLED = 'payment.cancelled',
  
  /** 결제 부분 취소 */
  PAYMENT_PARTIAL_CANCELLED = 'payment.partialCancelled',
}

/**
 * 결제 이벤트 데이터 인터페이스
 */
export interface PaymentEventData {
  /** 이벤트 타입 */
  eventType: PaymentEventType;
  
  /** 이벤트 발생 시각 */
  createdAt: string;
  
  /** 결제 데이터 */
  data: TossPaymentResponseDto;
}

/**
 * 결제 에러 인터페이스
 */
export interface PaymentError {
  /** 에러 코드 */
  code: string;
  
  /** 에러 메시지 */
  message: string;
  
  /** 상세 정보 */
  details?: any;
}

/**
 * 결제 검증 결과 인터페이스
 */
export interface PaymentValidationResult {
  /** 검증 성공 여부 */
  isValid: boolean;
  
  /** 검증 실패 사유 */
  reason?: string;
  
  /** 예상 금액과 실제 금액 일치 여부 */
  amountMatch: boolean;
  
  /** 주문 상태 유효성 */
  orderStatusValid: boolean;
}

/**
 * 결제 재시도 설정 인터페이스
 */
export interface PaymentRetryConfig {
  /** 최대 재시도 횟수 */
  maxRetries: number;
  
  /** 재시도 간격 (밀리초) */
  retryInterval: number;
  
  /** 지수 백오프 사용 여부 */
  useExponentialBackoff: boolean;
  
  /** 재시도 가능한 에러 코드 목록 */
  retryableErrorCodes: string[];
}

/**
 * 결제 통계 인터페이스
 */
export interface PaymentAnalytics {
  /** 일별 결제 통계 */
  dailyStats: {
    date: string;
    totalAmount: number;
    transactionCount: number;
    successRate: number;
  }[];
  
  /** 결제 방법별 통계 */
  methodStats: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  
  /** 실패 사유별 통계 */
  failureStats: {
    reason: string;
    count: number;
    percentage: number;
  }[];
} 