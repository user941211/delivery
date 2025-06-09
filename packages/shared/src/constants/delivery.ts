/**
 * 배달 관련 상수 정의
 */

/** 기본 배달비 (원) */
export const DEFAULT_DELIVERY_FEE = 3000;

/** 무료배달 최소 주문금액 (원) */
export const FREE_DELIVERY_MINIMUM_AMOUNT = 15000;

/** 최대 배달 거리 (km) */
export const MAX_DELIVERY_DISTANCE = 10;

/** 기본 배달 시간 (분) */
export const DEFAULT_DELIVERY_TIME = 30;

/** 최대 배달 시간 (분) */
export const MAX_DELIVERY_TIME = 120;

/** 배달기사 배정 대기 시간 (분) */
export const DRIVER_ASSIGNMENT_TIMEOUT = 10;

/** 배달 상태별 표시명 */
export const DELIVERY_STATUS_LABELS = {
  assigned: '배달기사 배정',
  accepted: '배달 수락',
  rejected: '배달 거부',
  pickup_pending: '픽업 대기',
  picked_up: '픽업 완료',
  in_transit: '배달 중',
  arrived: '도착',
  delivered: '배달 완료',
  failed: '배달 실패',
  cancelled: '배달 취소'
} as const;

/** 배달 우선순위 */
export const DELIVERY_PRIORITIES = {
  low: { label: '낮음', weight: 1 },
  normal: { label: '보통', weight: 2 },
  high: { label: '높음', weight: 3 },
  urgent: { label: '긴급', weight: 4 }
} as const;

/** 배달 구역별 추가 배달비 (원/km) */
export const DELIVERY_ZONE_RATES = {
  zone_a: 1000,  // 1km당 1000원
  zone_b: 1500,  // 1km당 1500원
  zone_c: 2000   // 1km당 2000원
} as const;

/** 시간대별 배달비 할증률 */
export const DELIVERY_TIME_MULTIPLIERS = {
  peak_hours: 1.5,     // 피크시간 (18:00-21:00)
  late_night: 2.0,     // 심야시간 (22:00-06:00)
  early_morning: 1.3,  // 이른아침 (06:00-09:00)
  normal: 1.0          // 일반시간
} as const;

/** 날씨별 배달비 할증률 */
export const WEATHER_DELIVERY_MULTIPLIERS = {
  sunny: 1.0,
  cloudy: 1.0,
  rainy: 1.5,
  snowy: 2.0,
  stormy: 3.0
} as const;

/** 배달 차량 타입별 수수료율 */
export const VEHICLE_TYPE_RATES = {
  motorcycle: 0.15,  // 15%
  bicycle: 0.12,     // 12%
  car: 0.18,         // 18%
  scooter: 0.14      // 14%
} as const; 