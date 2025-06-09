/**
 * 결제 관련 타입 정의
 * 
 * 결제 처리, 쿠폰, 정산 등 결제 시스템에 필요한 모든 타입을 정의합니다.
 */

import { BaseEntity } from './base';

/** 결제 방식 */
export type PaymentMethod = 
  | 'credit_card'      // 신용카드
  | 'debit_card'       // 체크카드
  | 'bank_transfer'    // 계좌이체
  | 'mobile_payment'   // 모바일 결제 (카카오페이, 네이버페이 등)
  | 'cash_on_delivery' // 현금 결제
  | 'digital_wallet'   // 디지털 지갑
  | 'points'           // 적립금
  | 'cryptocurrency';  // 암호화폐

/** 결제 상태 */
export type PaymentStatus = 
  | 'pending'          // 결제 대기
  | 'processing'       // 결제 처리 중
  | 'completed'        // 결제 완료
  | 'failed'           // 결제 실패
  | 'cancelled'        // 결제 취소
  | 'refunded'         // 환불 완료
  | 'partially_refunded' // 부분 환불
  | 'disputed'         // 결제 분쟁
  | 'expired';         // 결제 만료

/** 결제 트랜잭션 */
export interface PaymentTransaction extends BaseEntity {
  /** 주문 ID */
  orderId: string;
  /** 고객 ID */
  customerId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 트랜잭션 번호 */
  transactionNumber: string;
  /** PG사 거래 ID */
  pgTransactionId?: string;
  /** 결제 방식 */
  method: PaymentMethod;
  /** 결제 상태 */
  status: PaymentStatus;
  /** 결제 금액 */
  amount: number;
  /** 통화 */
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY';
  /** 결제 수수료 */
  processingFee: number;
  /** 결제 승인 번호 */
  approvalNumber?: string;
  /** 결제 완료 시간 */
  paidAt?: Date;
  /** 실패 사유 */
  failureReason?: string;
  /** 결제 게이트웨이 */
  gateway: PaymentGateway;
  /** 카드 정보 (마스킹) */
  cardInfo?: MaskedCardInfo;
  /** 환불 정보 */
  refunds: PaymentRefund[];
  /** 분쟁 정보 */
  dispute?: PaymentDispute;
}

/** 결제 게이트웨이 */
export type PaymentGateway = 
  | 'toss_payments'    // 토스페이먼츠
  | 'iamport'          // 아이엠포트
  | 'nice_payments'    // 나이스페이
  | 'kg_inicis'        // KG이니시스
  | 'kakao_pay'        // 카카오페이
  | 'naver_pay'        // 네이버페이
  | 'paypal'           // 페이팔
  | 'stripe';          // 스트라이프

/** 마스킹된 카드 정보 */
export interface MaskedCardInfo {
  /** 카드 번호 (마스킹) */
  maskedNumber: string;
  /** 카드 브랜드 */
  brand: 'visa' | 'mastercard' | 'amex' | 'jcb' | 'diners' | 'unionpay' | 'discover';
  /** 발급사 */
  issuer?: string;
  /** 카드 타입 */
  type: 'credit' | 'debit' | 'prepaid';
  /** 만료월 */
  expiryMonth: string;
  /** 만료년 */
  expiryYear: string;
}

/** 결제 환불 */
export interface PaymentRefund extends BaseEntity {
  /** 결제 트랜잭션 ID */
  paymentTransactionId: string;
  /** 환불 번호 */
  refundNumber: string;
  /** PG사 환불 ID */
  pgRefundId?: string;
  /** 환불 금액 */
  amount: number;
  /** 환불 사유 */
  reason: string;
  /** 환불 상태 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 환불 요청자 */
  requestedBy: string;
  /** 환불 승인자 */
  approvedBy?: string;
  /** 환불 처리 시간 */
  processedAt?: Date;
  /** 실패 사유 */
  failureReason?: string;
}

/** 결제 분쟁 */
export interface PaymentDispute extends BaseEntity {
  /** 결제 트랜잭션 ID */
  paymentTransactionId: string;
  /** 분쟁 번호 */
  disputeNumber: string;
  /** 분쟁 타입 */
  type: 'chargeback' | 'fraud' | 'duplicate' | 'unrecognized' | 'credit_not_processed';
  /** 분쟁 상태 */
  status: 'open' | 'under_review' | 'won' | 'lost' | 'accepted';
  /** 분쟁 금액 */
  amount: number;
  /** 분쟁 사유 */
  reason: string;
  /** 증거 자료 */
  evidence: DisputeEvidence[];
  /** 분쟁 마감일 */
  dueDate: Date;
  /** 해결일 */
  resolvedAt?: Date;
}

/** 분쟁 증거 자료 */
export interface DisputeEvidence {
  /** 증거 타입 */
  type: 'receipt' | 'communication' | 'shipping_proof' | 'customer_signature' | 'other';
  /** 파일 URL */
  fileUrl: string;
  /** 설명 */
  description: string;
  /** 업로드 시간 */
  uploadedAt: Date;
}

/** 쿠폰 */
export interface Coupon extends BaseEntity {
  /** 쿠폰 코드 */
  code: string;
  /** 쿠폰명 */
  name: string;
  /** 쿠폰 설명 */
  description: string;
  /** 쿠폰 타입 */
  type: CouponType;
  /** 할인 타입 */
  discountType: 'percentage' | 'fixed';
  /** 할인 값 */
  discountValue: number;
  /** 최소 주문 금액 */
  minimumOrderAmount?: number;
  /** 최대 할인 금액 */
  maximumDiscountAmount?: number;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 활성화 여부 */
  isActive: boolean;
  /** 사용 횟수 제한 */
  usageLimit?: number;
  /** 현재 사용 횟수 */
  usageCount: number;
  /** 사용자당 사용 제한 */
  perUserLimit?: number;
  /** 대상 고객 그룹 */
  targetCustomerGroup?: 'all' | 'new' | 'vip' | 'specific';
  /** 특정 고객 ID들 (specific인 경우) */
  targetCustomerIds?: string[];
  /** 적용 가능 음식점 ID들 */
  applicableRestaurantIds?: string[];
  /** 적용 가능 카테고리 ID들 */
  applicableCategoryIds?: string[];
}

/** 쿠폰 타입 */
export type CouponType = 
  | 'welcome'          // 가입 축하
  | 'birthday'         // 생일 축하
  | 'loyalty'          // 충성도 보상
  | 'promotion'        // 프로모션
  | 'referral'         // 추천인 보상
  | 'recovery'         // 고객 복귀
  | 'seasonal'         // 시즌 이벤트
  | 'compensation';    // 보상

/** 쿠폰 사용 내역 */
export interface CouponUsage extends BaseEntity {
  /** 쿠폰 ID */
  couponId: string;
  /** 고객 ID */
  customerId: string;
  /** 주문 ID */
  orderId: string;
  /** 할인 금액 */
  discountAmount: number;
  /** 사용 시간 */
  usedAt: Date;
}

/** 적립금 */
export interface PointsAccount extends BaseEntity {
  /** 고객 ID */
  customerId: string;
  /** 현재 잔액 */
  balance: number;
  /** 총 적립 금액 */
  totalEarned: number;
  /** 총 사용 금액 */
  totalSpent: number;
  /** 만료 예정 적립금 */
  expiringPoints: {
    amount: number;
    expiryDate: Date;
  }[];
}

/** 적립금 트랜잭션 */
export interface PointsTransaction extends BaseEntity {
  /** 적립금 계정 ID */
  accountId: string;
  /** 고객 ID */
  customerId: string;
  /** 주문 ID (해당하는 경우) */
  orderId?: string;
  /** 트랜잭션 타입 */
  type: 'earn' | 'spend' | 'expire' | 'refund' | 'adjust';
  /** 금액 (양수: 적립, 음수: 사용) */
  amount: number;
  /** 설명 */
  description: string;
  /** 만료일 (적립인 경우) */
  expiryDate?: Date;
  /** 트랜잭션 후 잔액 */
  balanceAfter: number;
}

/** 정산 정보 */
export interface Settlement extends BaseEntity {
  /** 음식점 ID */
  restaurantId: string;
  /** 정산 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 총 주문 수 */
  totalOrders: number;
  /** 총 매출액 */
  totalRevenue: number;
  /** 플랫폼 수수료 */
  platformFee: number;
  /** 결제 수수료 */
  paymentFee: number;
  /** 기타 공제액 */
  otherDeductions: number;
  /** 정산 금액 */
  settlementAmount: number;
  /** 정산 상태 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 정산일 */
  settledAt?: Date;
  /** 은행 계좌 정보 */
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
  /** 세부 내역 */
  details: SettlementDetail[];
}

/** 정산 세부 내역 */
export interface SettlementDetail {
  /** 주문 ID */
  orderId: string;
  /** 주문 날짜 */
  orderDate: Date;
  /** 주문 금액 */
  orderAmount: number;
  /** 플랫폼 수수료 */
  platformFee: number;
  /** 결제 수수료 */
  paymentFee: number;
  /** 순 수익 */
  netRevenue: number;
}

/** 결제 통계 */
export interface PaymentStats {
  /** 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 총 결제 건수 */
  totalTransactions: number;
  /** 총 결제 금액 */
  totalAmount: number;
  /** 평균 결제 금액 */
  averageAmount: number;
  /** 결제 방식별 통계 */
  byMethod: {
    method: PaymentMethod;
    count: number;
    amount: number;
    percentage: number;
  }[];
  /** 성공/실패 비율 */
  successRate: number;
  /** 환불 통계 */
  refundStats: {
    totalRefunds: number;
    totalRefundAmount: number;
    refundRate: number;
  };
  /** 시간대별 결제 패턴 */
  hourlyPattern: {
    hour: number;
    transactionCount: number;
    amount: number;
  }[];
} 