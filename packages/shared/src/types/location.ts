/**
 * 위치 관련 타입 정의
 * 
 * 지리적 위치, 지역 정보, 거리 계산 등 위치 기반 서비스에 필요한 모든 타입을 정의합니다.
 */

/** 위치 좌표 */
export interface Coordinates {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
}

/** 확장된 위치 정보 */
export interface Location extends Coordinates {
  /** 주소 */
  address?: string;
  /** 정확도 (미터) */
  accuracy?: number;
  /** 고도 (미터) */
  altitude?: number;
  /** 방향 (도, 0-360) */
  heading?: number;
  /** 속도 (m/s) */
  speed?: number;
  /** 타임스탬프 */
  timestamp?: Date;
}

/** 한국 행정구역 */
export interface KoreanAddress {
  /** 시/도 */
  sido: string;
  /** 시/군/구 */
  sigungu: string;
  /** 읍/면/동 */
  eupmyeondong: string;
  /** 리 (해당하는 경우) */
  ri?: string;
  /** 도로명 */
  roadName?: string;
  /** 건물번호 */
  buildingNumber?: string;
  /** 상세주소 */
  detailAddress?: string;
  /** 우편번호 */
  zipCode: string;
  /** 영문 주소 */
  englishAddress?: string;
}

/** 지역 경계 */
export interface RegionBoundary {
  /** 지역 ID */
  id: string;
  /** 지역명 */
  name: string;
  /** 지역 타입 */
  type: 'sido' | 'sigungu' | 'eupmyeondong' | 'delivery_zone' | 'service_area';
  /** 경계 좌표들 (GeoJSON Polygon) */
  boundaries: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  /** 중심점 */
  center: Coordinates;
  /** 면적 (km²) */
  area?: number;
  /** 부모 지역 ID */
  parentId?: string;
  /** 자식 지역 ID들 */
  childrenIds?: string[];
}

/** 거리 정보 */
export interface DistanceInfo {
  /** 직선 거리 (km) */
  straightDistance: number;
  /** 도로 거리 (km) */
  roadDistance?: number;
  /** 소요 시간 (분) */
  duration?: number;
  /** 교통 수단 */
  transportMethod?: 'walking' | 'driving' | 'cycling' | 'public_transit';
}

/** 배달 가능 지역 */
export interface DeliveryArea {
  /** 지역 ID */
  id: string;
  /** 지역명 */
  name: string;
  /** 중심점 (보통 음식점 위치) */
  center: Coordinates;
  /** 배달 가능 반경 (km) */
  radius: number;
  /** 복잡한 경계 (다각형) */
  boundaries?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  /** 기본 배달비 */
  baseDeliveryFee: number;
  /** 거리별 추가 배달비 */
  additionalFeePerKm: number;
  /** 최소 주문 금액 */
  minimumOrderAmount: number;
  /** 평균 배달 시간 (분) */
  averageDeliveryTime: number;
  /** 활성화 여부 */
  isActive: boolean;
}

/** 지오펜스 */
export interface Geofence {
  /** 지오펜스 ID */
  id: string;
  /** 지오펜스명 */
  name: string;
  /** 지오펜스 타입 */
  type: 'circle' | 'polygon';
  /** 원형 지오펜스 (type이 circle인 경우) */
  circle?: {
    center: Coordinates;
    radius: number; // 미터
  };
  /** 다각형 지오펜스 (type이 polygon인 경우) */
  polygon?: {
    coordinates: Coordinates[];
  };
  /** 트리거 조건 */
  trigger: 'enter' | 'exit' | 'dwell';
  /** 머무름 시간 (dwell인 경우, 초) */
  dwellTime?: number;
  /** 활성화 여부 */
  isActive: boolean;
  /** 생성 시간 */
  createdAt: Date;
}

/** 지오펜스 이벤트 */
export interface GeofenceEvent {
  /** 이벤트 ID */
  id: string;
  /** 지오펜스 ID */
  geofenceId: string;
  /** 사용자/기기 ID */
  userId: string;
  /** 이벤트 타입 */
  eventType: 'enter' | 'exit' | 'dwell';
  /** 위치 정보 */
  location: Location;
  /** 이벤트 발생 시간 */
  timestamp: Date;
  /** 추가 데이터 */
  metadata?: Record<string, any>;
}

/** 근처 장소 검색 결과 */
export interface NearbyPlace {
  /** 장소 ID */
  id: string;
  /** 장소명 */
  name: string;
  /** 장소 타입 */
  type: 'restaurant' | 'landmark' | 'bus_stop' | 'subway_station' | 'building';
  /** 위치 */
  location: Coordinates;
  /** 주소 */
  address: string;
  /** 거리 정보 */
  distance: DistanceInfo;
  /** 평점 */
  rating?: number;
  /** 추가 정보 */
  details?: Record<string, any>;
}

/** 경로 정보 */
export interface Route {
  /** 경로 ID */
  id: string;
  /** 시작점 */
  origin: Location;
  /** 목적지 */
  destination: Location;
  /** 경유지들 */
  waypoints: Location[];
  /** 총 거리 (km) */
  totalDistance: number;
  /** 총 소요 시간 (분) */
  totalDuration: number;
  /** 교통 수단 */
  transportMethod: 'walking' | 'driving' | 'cycling' | 'public_transit';
  /** 경로 좌표들 (인코딩된 폴리라인) */
  encodedPolyline: string;
  /** 상세 경로 좌표들 */
  coordinates?: Coordinates[];
  /** 단계별 안내 */
  steps: RouteStep[];
  /** 교통 상황 */
  trafficCondition?: 'light' | 'moderate' | 'heavy';
  /** 경로 생성 시간 */
  createdAt: Date;
}

/** 경로 단계 */
export interface RouteStep {
  /** 단계 설명 */
  instruction: string;
  /** 거리 (km) */
  distance: number;
  /** 소요 시간 (분) */
  duration: number;
  /** 시작 위치 */
  startLocation: Coordinates;
  /** 종료 위치 */
  endLocation: Coordinates;
  /** 방향 */
  maneuver: 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'merge' | 'fork';
  /** 도로명 */
  roadName?: string;
}

/** 위치 기반 검색 필터 */
export interface LocationSearchFilter {
  /** 중심점 */
  center: Coordinates;
  /** 검색 반경 (km) */
  radius: number;
  /** 경계 상자 */
  bounds?: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
  /** 장소 타입들 */
  types?: string[];
  /** 키워드 */
  keyword?: string;
  /** 최소 평점 */
  minRating?: number;
  /** 현재 영업 중만 */
  openNow?: boolean;
  /** 가격 범위 */
  priceLevel?: number[];
}

/** 지오코딩 요청 */
export interface GeocodingRequest {
  /** 주소 */
  address: string;
  /** 국가 코드 */
  countryCode?: string;
  /** 지역 편향 */
  regionBias?: Coordinates;
  /** 언어 */
  language?: string;
}

/** 역 지오코딩 요청 */
export interface ReverseGeocodingRequest {
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 결과 타입들 */
  resultTypes?: string[];
  /** 언어 */
  language?: string;
}

/** 위치 추적 설정 */
export interface LocationTrackingConfig {
  /** 업데이트 간격 (초) */
  updateInterval: number;
  /** 최소 거리 변화 (미터) */
  minimumDistance: number;
  /** 정확도 요구사항 */
  desiredAccuracy: 'high' | 'medium' | 'low';
  /** 배터리 최적화 */
  optimizeForBattery: boolean;
  /** 백그라운드 추적 허용 */
  allowBackgroundTracking: boolean;
  /** 만료 시간 (초) */
  expirationTime?: number;
}

/** 위치 권한 상태 */
export type LocationPermissionStatus = 
  | 'granted'
  | 'denied' 
  | 'restricted'
  | 'not_determined'
  | 'denied_forever';

/** 위치 서비스 상태 */
export interface LocationServiceStatus {
  /** 위치 서비스 활성화 여부 */
  isLocationServiceEnabled: boolean;
  /** GPS 활성화 여부 */
  isGpsEnabled: boolean;
  /** 네트워크 위치 활성화 여부 */
  isNetworkLocationEnabled: boolean;
  /** 권한 상태 */
  permissionStatus: LocationPermissionStatus;
  /** 마지막 확인 시간 */
  lastCheckedAt: Date;
} 