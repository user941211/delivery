/**
 * 배달 관련 타입 정의
 * 
 * 배달 추적, 배달기사 관리, 배달 경로 등 배달 서비스에 필요한 모든 타입을 정의합니다.
 */

import { BaseEntity } from './base';

/** 배달 상태 */
export type DeliveryStatus = 
  | 'assigned'          // 배달기사 배정
  | 'accepted'          // 배달기사 수락
  | 'rejected'          // 배달기사 거부
  | 'pickup_pending'    // 픽업 대기
  | 'picked_up'         // 픽업 완료
  | 'in_transit'        // 배달 중
  | 'arrived'           // 도착
  | 'delivered'         // 배달 완료
  | 'failed'            // 배달 실패
  | 'cancelled';        // 배달 취소

/** 배달 정보 */
export interface Delivery extends BaseEntity {
  /** 주문 ID */
  orderId: string;
  /** 배달기사 ID */
  driverId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 고객 ID */
  customerId: string;
  /** 배달 상태 */
  status: DeliveryStatus;
  /** 픽업 주소 */
  pickupAddress: DeliveryAddress;
  /** 배달 주소 */
  deliveryAddress: DeliveryAddress;
  /** 배달 거리 (km) */
  distance: number;
  /** 예상 배달 시간 (분) */
  estimatedDuration: number;
  /** 실제 배달 시간 (분) */
  actualDuration?: number;
  /** 배달비 */
  deliveryFee: number;
  /** 팁 */
  tip?: number;
  /** 배달 지시사항 */
  instructions?: string;
  /** 배달 경로 */
  route?: DeliveryRoute;
  /** 배달 추적 정보 */
  tracking: DeliveryTracking[];
  /** 배정 시간 */
  assignedAt: Date;
  /** 수락 시간 */
  acceptedAt?: Date;
  /** 픽업 시간 */
  pickedUpAt?: Date;
  /** 배달 완료 시간 */
  deliveredAt?: Date;
  /** 실패 사유 */
  failureReason?: string;
  /** 취소 사유 */
  cancellationReason?: string;
  /** 배달 증명 사진 */
  proofOfDeliveryUrl?: string;
  /** 고객 서명 */
  customerSignature?: string;
}

/** 배달 주소 */
export interface DeliveryAddress {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 전체 주소 */
  fullAddress: string;
  /** 상세 주소 */
  detailAddress?: string;
  /** 연락처 */
  phone: string;
  /** 수령인 이름 */
  recipientName?: string;
  /** 특별 지시사항 */
  specialInstructions?: string;
}

/** 배달 경로 */
export interface DeliveryRoute {
  /** 시작점 */
  origin: LocationPoint;
  /** 목적지 */
  destination: LocationPoint;
  /** 경유지들 */
  waypoints: LocationPoint[];
  /** 총 거리 (km) */
  totalDistance: number;
  /** 예상 시간 (분) */
  estimatedDuration: number;
  /** 경로 좌표들 */
  polyline: string;
  /** 교통 상황 */
  trafficCondition?: 'light' | 'moderate' | 'heavy';
}

/** 위치 좌표 */
export interface LocationPoint {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 주소 */
  address?: string;
  /** 타임스탬프 */
  timestamp?: Date;
}

/** 배달 추적 정보 */
export interface DeliveryTracking extends BaseEntity {
  /** 배달 ID */
  deliveryId: string;
  /** 배달 상태 */
  status: DeliveryStatus;
  /** 위치 정보 */
  location: LocationPoint;
  /** 메시지 */
  message?: string;
  /** 타임스탬프 */
  timestamp: Date;
  /** 예상 도착 시간 */
  estimatedArrival?: Date;
}

/** 배달 요청 */
export interface DeliveryRequest {
  /** 주문 ID */
  orderId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 픽업 주소 */
  pickupAddress: DeliveryAddress;
  /** 배달 주소 */
  deliveryAddress: DeliveryAddress;
  /** 예상 픽업 시간 */
  estimatedPickupTime: Date;
  /** 우선순위 */
  priority: 'low' | 'normal' | 'high' | 'urgent';
  /** 배달비 */
  deliveryFee: number;
  /** 특별 요구사항 */
  specialRequirements?: string[];
}

/** 배달기사 위치 업데이트 */
export interface DriverLocationUpdate {
  /** 배달기사 ID */
  driverId: string;
  /** 위치 정보 */
  location: LocationPoint;
  /** 방향 (도) */
  heading?: number;
  /** 속도 (km/h) */
  speed?: number;
  /** 배달 중인 주문 ID */
  activeDeliveryId?: string;
  /** 온라인 상태 */
  isOnline: boolean;
}

/** 배달 구역 */
export interface DeliveryZone extends BaseEntity {
  /** 구역명 */
  name: string;
  /** 구역 설명 */
  description?: string;
  /** 구역 경계 (GeoJSON 형식) */
  boundaries: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  /** 활성화 여부 */
  isActive: boolean;
  /** 기본 배달비 */
  baseDeliveryFee: number;
  /** 추가 배달비 (거리당) */
  additionalFeePerKm: number;
  /** 최대 배달 거리 (km) */
  maxDeliveryDistance: number;
  /** 평균 배달 시간 (분) */
  averageDeliveryTime: number;
  /** 담당 배달기사들 */
  assignedDriverIds: string[];
}

/** 배달기사 성과 */
export interface DriverPerformance {
  /** 배달기사 ID */
  driverId: string;
  /** 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 총 배달 수 */
  totalDeliveries: number;
  /** 성공 배달 수 */
  successfulDeliveries: number;
  /** 실패 배달 수 */
  failedDeliveries: number;
  /** 취소된 배달 수 */
  cancelledDeliveries: number;
  /** 성공률 (%) */
  successRate: number;
  /** 평균 배달 시간 (분) */
  averageDeliveryTime: number;
  /** 평균 평점 */
  averageRating: number;
  /** 총 수익 */
  totalEarnings: number;
  /** 총 거리 (km) */
  totalDistance: number;
  /** 온라인 시간 (시간) */
  onlineHours: number;
  /** 지연 배달 수 */
  lateDeliveries: number;
  /** 고객 피드백 점수 */
  customerFeedbackScore: number;
}

/** 배달 통계 */
export interface DeliveryStats {
  /** 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 총 배달 수 */
  totalDeliveries: number;
  /** 성공한 배달 수 */
  successfulDeliveries: number;
  /** 평균 배달 시간 (분) */
  averageDeliveryTime: number;
  /** 평균 배달 거리 (km) */
  averageDeliveryDistance: number;
  /** 평균 배달비 */
  averageDeliveryFee: number;
  /** 최다 배달 시간대 */
  peakHours: {
    hour: number;
    deliveryCount: number;
  }[];
  /** 지역별 배달 수 */
  deliveriesByZone: {
    zoneId: string;
    zoneName: string;
    deliveryCount: number;
  }[];
  /** 배달기사별 성과 */
  driverPerformances: DriverPerformance[];
}

/** 실시간 배달 모니터링 */
export interface RealTimeDeliveryMonitoring {
  /** 진행 중인 배달들 */
  activeDeliveries: {
    deliveryId: string;
    orderId: string;
    driverId: string;
    status: DeliveryStatus;
    currentLocation: LocationPoint;
    estimatedArrival: Date;
    progressPercentage: number;
  }[];
  /** 대기 중인 주문들 */
  pendingOrders: {
    orderId: string;
    restaurantId: string;
    waitingTime: number; // 분
    priority: 'low' | 'normal' | 'high' | 'urgent';
  }[];
  /** 온라인 배달기사들 */
  onlineDrivers: {
    driverId: string;
    currentLocation: LocationPoint;
    isAvailable: boolean;
    activeDeliveryId?: string;
  }[];
  /** 시스템 상태 */
  systemHealth: {
    averageResponseTime: number;
    activeDriversCount: number;
    pendingOrdersCount: number;
    averageDeliveryTime: number;
  };
} 