/**
 * 주문 관련 상수 정의
 */

/** 주문 번호 접두사 */
export const ORDER_NUMBER_PREFIX = 'ORD';

/** 주문 번호 길이 */
export const ORDER_NUMBER_LENGTH = 12;

/** 주문 취소 가능 시간 (분) */
export const ORDER_CANCELLATION_WINDOW = 5;

/** 주문 자동 확인 시간 (분) */
export const AUTO_CONFIRM_TIME = 3;

/** 주문 상태별 표시명 */
export const ORDER_STATUS_LABELS = {
  pending: '주문 접수',
  confirmed: '주문 확인',
  preparing: '조리 중',
  ready_for_pickup: '픽업 대기',
  picked_up: '픽업 완료',
  delivering: '배달 중',
  delivered: '배달 완료',
  cancelled: '주문 취소',
  refunded: '환불 완료'
} as const;

/** 주문 타입별 표시명 */
export const ORDER_TYPE_LABELS = {
  delivery: '배달',
  pickup: '포장',
  dine_in: '매장식사'
} as const;

/** 결제 방식별 표시명 */
export const PAYMENT_METHOD_LABELS = {
  credit_card: '신용카드',
  debit_card: '체크카드',
  bank_transfer: '계좌이체',
  mobile_payment: '모바일결제',
  cash_on_delivery: '만나서결제',
  digital_wallet: '디지털지갑',
  points: '적립금',
  cryptocurrency: '암호화폐'
} as const;

/** 주문 우선순위 */
export const ORDER_PRIORITIES = {
  low: { label: '낮음', weight: 1 },
  normal: { label: '보통', weight: 2 },
  high: { label: '높음', weight: 3 },
  urgent: { label: '긴급', weight: 4 }
} as const;

/** 최대 주문 수량 */
export const MAX_ORDER_QUANTITY_PER_ITEM = 99;

/** 최대 장바구니 아이템 수 */
export const MAX_CART_ITEMS = 50;

/** 장바구니 만료 시간 (시간) */
export const CART_EXPIRY_HOURS = 24;

/** 리뷰 작성 가능 기간 (일) */
export const REVIEW_DEADLINE_DAYS = 7;

/** 환불 처리 기간 (영업일) */
export const REFUND_PROCESSING_DAYS = 3; 