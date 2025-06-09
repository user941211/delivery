/**
 * 점주용 주문 관리 인터페이스
 * 
 * 점주가 주문을 관리하기 위한 인터페이스와 타입 정의입니다.
 */

import {
  OwnerOrderStatus,
  OrderRejectionReason,
  OwnerOrderQueryDto,
  OwnerOrderDetailDto,
  OwnerOrderListResponseDto,
  OwnerOrderStatsDto,
  UpdateOrderStatusDto,
  RejectOrderDto,
  SetCookingTimeDto,
  BulkOrderActionDto,
  OrderStatusNotificationDto
} from '../../dto/owner/owner-order.dto';

/**
 * 점주용 주문 관리 서비스 인터페이스
 * 점주가 주문을 처리하기 위한 모든 비즈니스 로직을 정의합니다.
 */
export interface OwnerOrderServiceInterface {
  /**
   * 점주별 주문 목록 조회
   * 점주의 매장에 대한 주문 목록을 필터링 및 페이지네이션으로 조회합니다.
   */
  getOrdersForOwner(ownerId: string, restaurantId: string, queryDto: OwnerOrderQueryDto): Promise<OwnerOrderListResponseDto>;

  /**
   * 특정 주문 상세 조회
   * 점주가 특정 주문의 상세 정보를 조회합니다.
   */
  getOrderDetail(ownerId: string, orderId: string): Promise<OwnerOrderDetailDto>;

  /**
   * 주문 상태 업데이트
   * 점주가 주문의 상태를 변경합니다.
   */
  updateOrderStatus(ownerId: string, orderId: string, updateDto: UpdateOrderStatusDto): Promise<OwnerOrderDetailDto>;

  /**
   * 주문 거부 처리
   * 점주가 주문을 거부하고 환불을 처리합니다.
   */
  rejectOrder(ownerId: string, orderId: string, rejectDto: RejectOrderDto): Promise<OwnerOrderDetailDto>;

  /**
   * 조리 시간 설정
   * 점주가 특정 주문의 예상 조리 시간을 설정합니다.
   */
  setCookingTime(ownerId: string, orderId: string, setCookingTimeDto: SetCookingTimeDto): Promise<OwnerOrderDetailDto>;

  /**
   * 주문 일괄 처리
   * 여러 주문을 한 번에 처리합니다.
   */
  bulkOrderAction(ownerId: string, restaurantId: string, bulkActionDto: BulkOrderActionDto): Promise<{
    success: string[];
    failed: Array<{ orderId: string; reason: string }>;
  }>;

  /**
   * 점주용 주문 통계 조회
   * 점주의 매장에 대한 주문 통계를 조회합니다.
   */
  getOrderStats(ownerId: string, restaurantId: string, startDate?: string, endDate?: string): Promise<OwnerOrderStatsDto>;

  /**
   * 실시간 대기 중인 주문 조회
   * 현재 처리가 필요한 주문들을 조회합니다.
   */
  getPendingOrders(ownerId: string, restaurantId: string): Promise<OwnerOrderDetailDto[]>;
}

/**
 * 주문 이벤트 타입 열거형
 */
export enum OrderEventType {
  /** 새 주문 접수 */
  ORDER_RECEIVED = 'order.received',
  
  /** 주문 확인됨 */
  ORDER_CONFIRMED = 'order.confirmed',
  
  /** 조리 시작됨 */
  COOKING_STARTED = 'order.cooking_started',
  
  /** 조리 완료됨 */
  COOKING_COMPLETED = 'order.cooking_completed',
  
  /** 배달 완료됨 */
  ORDER_DELIVERED = 'order.delivered',
  
  /** 주문 거부됨 */
  ORDER_REJECTED = 'order.rejected',
  
  /** 주문 취소됨 */
  ORDER_CANCELLED = 'order.cancelled',
  
  /** 조리 시간 업데이트됨 */
  COOKING_TIME_UPDATED = 'order.cooking_time_updated',
  
  /** 결제 상태 변경됨 */
  PAYMENT_STATUS_CHANGED = 'order.payment_status_changed',
}

/**
 * 주문 이벤트 데이터 인터페이스
 */
export interface OrderEventData {
  /** 이벤트 타입 */
  eventType: OrderEventType;
  
  /** 이벤트 발생 시각 */
  timestamp: Date;
  
  /** 주문 ID */
  orderId: string;
  
  /** 매장 ID */
  restaurantId: string;
  
  /** 이벤트 발생시킨 사용자 ID */
  triggeredBy?: string;
  
  /** 이벤트 관련 데이터 */
  data: {
    /** 이전 상태 */
    previousStatus?: OwnerOrderStatus;
    
    /** 새로운 상태 */
    newStatus?: OwnerOrderStatus;
    
    /** 변경 사유 */
    reason?: string;
    
    /** 예상 조리 시간 */
    estimatedCookingTime?: number;
    
    /** 거부 사유 */
    rejectionReason?: OrderRejectionReason;
    
    /** 고객 알림 여부 */
    customerNotified?: boolean;
    
    /** 추가 메타데이터 */
    metadata?: Record<string, any>;
  };
}

/**
 * 주문 알림 시스템 인터페이스
 */
export interface OrderNotificationInterface {
  /**
   * 점주에게 새 주문 알림 전송
   */
  notifyNewOrder(restaurantId: string, orderData: OwnerOrderDetailDto): Promise<void>;

  /**
   * 점주에게 주문 상태 변경 알림 전송
   */
  notifyOrderStatusChange(restaurantId: string, notification: OrderStatusNotificationDto): Promise<void>;

  /**
   * 고객에게 주문 상태 변경 알림 전송
   */
  notifyCustomerOrderStatusChange(customerId: string, notification: OrderStatusNotificationDto): Promise<void>;

  /**
   * 긴급 주문 알림 전송 (배달 지연 등)
   */
  notifyUrgentOrder(restaurantId: string, orderId: string, urgencyReason: string): Promise<void>;

  /**
   * 점주의 실시간 알림 구독 등록
   */
  subscribeOwnerNotifications(ownerId: string, restaurantId: string, connectionId: string): Promise<void>;

  /**
   * 점주의 실시간 알림 구독 해제
   */
  unsubscribeOwnerNotifications(connectionId: string): Promise<void>;
}

/**
 * 주문 검증 인터페이스
 */
export interface OrderValidationInterface {
  /**
   * 점주의 주문 접근 권한 확인
   */
  validateOwnerAccess(ownerId: string, orderId: string): Promise<boolean>;

  /**
   * 주문 상태 변경 가능 여부 확인
   */
  validateStatusChange(currentStatus: OwnerOrderStatus, newStatus: OwnerOrderStatus): boolean;

  /**
   * 조리 시간 설정 유효성 확인
   */
  validateCookingTime(cookingTime: number, orderItems: any[]): boolean;

  /**
   * 주문 거부 가능 여부 확인
   */
  validateOrderRejection(orderStatus: OwnerOrderStatus, paymentStatus: string): boolean;

  /**
   * 일괄 처리 요청 유효성 확인
   */
  validateBulkAction(orderIds: string[], action: string): Promise<{ valid: string[]; invalid: Array<{ orderId: string; reason: string }> }>;
}

/**
 * 주문 분석 인터페이스
 */
export interface OrderAnalyticsInterface {
  /**
   * 주문 처리 시간 분석
   */
  analyzeOrderProcessingTime(restaurantId: string, dateRange: { start: string; end: string }): Promise<{
    averageConfirmationTime: number;
    averageCookingTime: number;
    averageDeliveryTime: number;
    totalProcessingTime: number;
  }>;

  /**
   * 주문 패턴 분석
   */
  analyzeOrderPatterns(restaurantId: string, dateRange: { start: string; end: string }): Promise<{
    peakHours: Array<{ hour: number; orderCount: number }>;
    popularMenuItems: Array<{ menuName: string; orderCount: number; revenue: number }>;
    averageOrderValue: number;
    customerReturnRate: number;
  }>;

  /**
   * 주문 성과 지표 계산
   */
  calculatePerformanceMetrics(restaurantId: string, dateRange: { start: string; end: string }): Promise<{
    orderAcceptanceRate: number;
    averageRating: number;
    deliverySuccessRate: number;
    customerSatisfactionScore: number;
  }>;
}

/**
 * 주문 워크플로우 인터페이스
 */
export interface OrderWorkflowInterface {
  /**
   * 주문 상태 워크플로우 정의
   */
  getStatusWorkflow(): Map<OwnerOrderStatus, OwnerOrderStatus[]>;

  /**
   * 다음 가능한 상태 조회
   */
  getNextPossibleStatuses(currentStatus: OwnerOrderStatus): OwnerOrderStatus[];

  /**
   * 자동 상태 전환 규칙 처리
   */
  processAutoStatusTransition(orderId: string, eventType: OrderEventType): Promise<void>;

  /**
   * 상태 전환 시 실행할 액션 정의
   */
  executeStatusTransitionActions(orderId: string, fromStatus: OwnerOrderStatus, toStatus: OwnerOrderStatus): Promise<void>;
}

/**
 * 주문 이력 추적 인터페이스
 */
export interface OrderAuditInterface {
  /**
   * 주문 상태 변경 이력 기록
   */
  logStatusChange(orderId: string, change: {
    fromStatus: OwnerOrderStatus;
    toStatus: OwnerOrderStatus;
    changedBy: string;
    reason?: string;
    timestamp: Date;
  }): Promise<void>;

  /**
   * 주문 이벤트 기록
   */
  logOrderEvent(orderId: string, event: OrderEventData): Promise<void>;

  /**
   * 주문 처리 시간 기록
   */
  logProcessingTime(orderId: string, phase: string, duration: number): Promise<void>;

  /**
   * 점주 액션 기록
   */
  logOwnerAction(ownerId: string, orderId: string, action: string, details?: any): Promise<void>;
}

/**
 * 주문 설정 인터페이스
 */
export interface OrderConfigurationInterface {
  /**
   * 매장별 운영 시간 확인
   */
  isRestaurantOpen(restaurantId: string): Promise<boolean>;

  /**
   * 매장별 배달 가능 지역 확인
   */
  isDeliveryAvailable(restaurantId: string, address: string): Promise<boolean>;

  /**
   * 매장별 최대 동시 주문 수 확인
   */
  getMaxConcurrentOrders(restaurantId: string): Promise<number>;

  /**
   * 매장별 평균 조리 시간 조회
   */
  getAverageCookingTime(restaurantId: string, menuItems: string[]): Promise<number>;

  /**
   * 점주 알림 설정 조회
   */
  getOwnerNotificationSettings(ownerId: string): Promise<{
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    soundAlerts: boolean;
  }>;
}

/**
 * 주문 에러 타입 열거형
 */
export enum OrderErrorType {
  /** 주문을 찾을 수 없음 */
  ORDER_NOT_FOUND = 'order_not_found',
  
  /** 권한 없음 */
  ACCESS_DENIED = 'access_denied',
  
  /** 잘못된 상태 전환 */
  INVALID_STATUS_TRANSITION = 'invalid_status_transition',
  
  /** 매장 영업 시간 외 */
  RESTAURANT_CLOSED = 'restaurant_closed',
  
  /** 주방 과부하 */
  KITCHEN_OVERLOADED = 'kitchen_overloaded',
  
  /** 배달 지역 제한 */
  DELIVERY_RESTRICTED = 'delivery_restricted',
  
  /** 결제 문제 */
  PAYMENT_ISSUE = 'payment_issue',
  
  /** 시스템 오류 */
  SYSTEM_ERROR = 'system_error',
}

/**
 * 주문 처리 결과 인터페이스
 */
export interface OrderProcessResult {
  /** 성공 여부 */
  success: boolean;
  
  /** 결과 메시지 */
  message: string;
  
  /** 업데이트된 주문 데이터 */
  orderData?: OwnerOrderDetailDto;
  
  /** 에러 정보 */
  error?: {
    type: OrderErrorType;
    code: string;
    details?: any;
  };
  
  /** 실행된 액션 목록 */
  executedActions?: string[];
  
  /** 알림 전송 결과 */
  notificationResults?: Array<{
    target: string;
    success: boolean;
    error?: string;
  }>;
} 