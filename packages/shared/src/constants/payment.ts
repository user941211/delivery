/**
 * 결제 관련 상수 정의
 */

/** 최소 주문금액 (원) */
export const MIN_ORDER_AMOUNT = 5000;

/** 최대 주문금액 (원) */
export const MAX_ORDER_AMOUNT = 1000000;

/** 기본 플랫폼 수수료율 */
export const DEFAULT_PLATFORM_FEE_RATE = 0.05; // 5%

/** 결제 방식별 수수료율 */
export const PAYMENT_METHOD_FEES = {
  credit_card: 0.025,      // 2.5%
  debit_card: 0.015,       // 1.5%
  bank_transfer: 0.008,    // 0.8%
  mobile_payment: 0.02,    // 2.0%
  cash_on_delivery: 0.0,   // 0%
  digital_wallet: 0.018,   // 1.8%
  points: 0.0,             // 0%
  cryptocurrency: 0.03     // 3.0%
} as const;

/** 결제 상태별 표시명 */
export const PAYMENT_STATUS_LABELS = {
  pending: '결제 대기',
  processing: '결제 처리 중',
  completed: '결제 완료',
  failed: '결제 실패',
  cancelled: '결제 취소',
  refunded: '환불 완료',
  partially_refunded: '부분 환불',
  disputed: '결제 분쟁',
  expired: '결제 만료'
} as const;

/** 쿠폰 타입별 표시명 */
export const COUPON_TYPE_LABELS = {
  welcome: '가입 축하',
  birthday: '생일 축하',
  loyalty: '충성도 보상',
  promotion: '프로모션',
  referral: '추천인 보상',
  recovery: '고객 복귀',
  seasonal: '시즌 이벤트',
  compensation: '보상'
} as const;

/** 기본 쿠폰 유효기간 (일) */
export const DEFAULT_COUPON_VALIDITY_DAYS = 30;

/** 적립금 적립률 */
export const POINTS_EARN_RATE = 0.01; // 1%

/** 적립금 최대 사용률 */
export const MAX_POINTS_USAGE_RATE = 0.3; // 30%

/** 적립금 만료기간 (일) */
export const POINTS_EXPIRY_DAYS = 365; 