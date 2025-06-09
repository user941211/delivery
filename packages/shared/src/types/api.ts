/**
 * API 응답 관련 타입 정의
 * 
 * REST API 응답, 에러 처리, WebSocket 메시지 등 API 통신에 필요한 모든 타입을 정의합니다.
 */

import { PaginationMeta } from './base';

/** 표준 API 응답 */
export interface ApiResponse<T = any> {
  /** 성공 여부 */
  success: boolean;
  /** 응답 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: ApiError;
  /** 메시지 */
  message?: string;
  /** 타임스탬프 */
  timestamp: string;
  /** 요청 ID (트레이싱용) */
  requestId: string;
}

/** 페이지네이션된 API 응답 */
export interface PaginatedApiResponse<T> {
  /** 성공 여부 */
  success: boolean;
  /** 데이터 배열 */
  data: T[];
  /** 페이지네이션 메타정보 */
  meta: PaginationMeta;
  /** 에러 정보 */
  error?: ApiError;
  /** 메시지 */
  message?: string;
  /** 타임스탬프 */
  timestamp: string;
  /** 요청 ID */
  requestId: string;
}

/** API 에러 정보 */
export interface ApiError {
  /** 에러 코드 */
  code: string;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: string;
  /** 필드별 에러 (유효성 검사 실패시) */
  fieldErrors?: Record<string, string[]>;
  /** 도움말 URL */
  helpUrl?: string;
  /** 내부 에러 ID */
  errorId?: string;
}

/** HTTP 상태 코드 */
export type HttpStatusCode = 
  | 200  // OK
  | 201  // Created
  | 202  // Accepted
  | 204  // No Content
  | 400  // Bad Request
  | 401  // Unauthorized
  | 403  // Forbidden
  | 404  // Not Found
  | 409  // Conflict
  | 422  // Unprocessable Entity
  | 429  // Too Many Requests
  | 500  // Internal Server Error
  | 502  // Bad Gateway
  | 503  // Service Unavailable
  | 504; // Gateway Timeout

/** API 에러 코드 */
export type ApiErrorCode = 
  // 인증/인가 관련
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  
  // 유효성 검사 관련
  | 'VALIDATION_FAILED'
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'VALIDATION_OUT_OF_RANGE'
  
  // 리소스 관련
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_CONFLICT'
  | 'RESOURCE_DELETED'
  
  // 비즈니스 로직 관련
  | 'BUSINESS_RULE_VIOLATION'
  | 'INSUFFICIENT_BALANCE'
  | 'ORDER_CANNOT_BE_CANCELLED'
  | 'RESTAURANT_CLOSED'
  | 'DELIVERY_UNAVAILABLE'
  | 'PAYMENT_FAILED'
  
  // 시스템 관련
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

/** WebSocket 메시지 타입 */
export type WebSocketMessageType = 
  | 'order_status_update'
  | 'delivery_location_update'
  | 'restaurant_status_update'
  | 'driver_location_update'
  | 'notification'
  | 'chat_message'
  | 'system_alert';

/** WebSocket 메시지 */
export interface WebSocketMessage<T = any> {
  /** 메시지 타입 */
  type: WebSocketMessageType;
  /** 메시지 데이터 */
  data: T;
  /** 타임스탬프 */
  timestamp: string;
  /** 발송자 ID */
  senderId?: string;
  /** 수신자 ID */
  recipientId?: string;
  /** 메시지 ID */
  messageId: string;
}

/** 주문 상태 업데이트 메시지 */
export interface OrderStatusUpdateMessage {
  /** 주문 ID */
  orderId: string;
  /** 새로운 상태 */
  status: string;
  /** 상태 메시지 */
  statusMessage?: string;
  /** 예상 시간 */
  estimatedTime?: string;
  /** 추가 정보 */
  additionalInfo?: Record<string, any>;
}

/** 배달 위치 업데이트 메시지 */
export interface DeliveryLocationUpdateMessage {
  /** 배달 ID */
  deliveryId: string;
  /** 주문 ID */
  orderId: string;
  /** 배달기사 ID */
  driverId: string;
  /** 현재 위치 */
  location: {
    latitude: number;
    longitude: number;
  };
  /** 예상 도착 시간 */
  estimatedArrival?: string;
  /** 진행률 (%) */
  progressPercentage?: number;
}

/** 알림 메시지 */
export interface NotificationMessage {
  /** 알림 ID */
  id: string;
  /** 알림 타입 */
  type: 'info' | 'success' | 'warning' | 'error';
  /** 제목 */
  title: string;
  /** 내용 */
  message: string;
  /** 액션 버튼들 */
  actions?: {
    label: string;
    action: string;
  }[];
  /** 자동 닫힘 시간 (초) */
  autoClose?: number;
}

/** API 요청 옵션 */
export interface ApiRequestOptions {
  /** 요청 헤더 */
  headers?: Record<string, string>;
  /** 쿼리 파라미터 */
  params?: Record<string, any>;
  /** 요청 타임아웃 (ms) */
  timeout?: number;
  /** 재시도 횟수 */
  retries?: number;
  /** 캐시 여부 */
  cache?: boolean;
  /** 인증 토큰 */
  token?: string;
}

/** API 요청 메타데이터 */
export interface ApiRequestMeta {
  /** 요청 URL */
  url: string;
  /** HTTP 메서드 */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** 요청 시작 시간 */
  startTime: number;
  /** 요청 종료 시간 */
  endTime?: number;
  /** 응답 시간 (ms) */
  duration?: number;
  /** 재시도 횟수 */
  retryCount: number;
  /** 사용자 에이전트 */
  userAgent?: string;
  /** IP 주소 */
  ipAddress?: string;
  /** 요청 ID */
  requestId: string;
}

/** 파일 업로드 응답 */
export interface FileUploadResponse {
  /** 파일 ID */
  fileId: string;
  /** 파일명 */
  filename: string;
  /** 원본 파일명 */
  originalName: string;
  /** MIME 타입 */
  mimeType: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** 파일 URL */
  url: string;
  /** 썸네일 URL (이미지인 경우) */
  thumbnailUrl?: string;
  /** 업로드 시간 */
  uploadedAt: string;
}

/** 배치 작업 응답 */
export interface BatchOperationResponse<T = any> {
  /** 총 처리 대상 수 */
  total: number;
  /** 성공 수 */
  successful: number;
  /** 실패 수 */
  failed: number;
  /** 성공한 아이템들 */
  successes: T[];
  /** 실패한 아이템들 */
  failures: {
    item: T;
    error: ApiError;
  }[];
  /** 배치 작업 ID */
  batchId: string;
  /** 처리 시간 (ms) */
  processingTime: number;
}

/** 헬스 체크 응답 */
export interface HealthCheckResponse {
  /** 서비스 상태 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 버전 정보 */
  version: string;
  /** 업타임 (초) */
  uptime: number;
  /** 의존성 서비스 상태 */
  dependencies: {
    name: string;
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }[];
  /** 시스템 정보 */
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  /** 체크 시간 */
  checkedAt: string;
}

/** 검색 제안 응답 */
export interface SearchSuggestionResponse {
  /** 제안 목록 */
  suggestions: {
    /** 제안 텍스트 */
    text: string;
    /** 제안 타입 */
    type: 'restaurant' | 'menu' | 'category' | 'location';
    /** 매칭 점수 */
    score: number;
    /** 추가 정보 */
    metadata?: Record<string, any>;
  }[];
  /** 검색 키워드 */
  query: string;
  /** 응답 시간 (ms) */
  responseTime: number;
}

/** 지오코딩 응답 */
export interface GeocodingResponse {
  /** 주소 */
  address: string;
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 상세 주소 구성요소 */
  components: {
    /** 도/시 */
    province?: string;
    /** 시/구 */
    city?: string;
    /** 구/동 */
    district?: string;
    /** 도로명 */
    street?: string;
    /** 건물번호 */
    buildingNumber?: string;
    /** 우편번호 */
    zipCode?: string;
  };
  /** 정확도 점수 (0-1) */
  confidence: number;
  /** 주소 타입 */
  type: 'exact' | 'approximate' | 'geometric_center';
} 