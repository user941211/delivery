/**
 * 주문 관련 타입 정의
 * 
 * 주문, 주문 아이템, 장바구니 등 주문 처리에 필요한 모든 타입을 정의합니다.
 */

import { BaseEntity, Address } from './base';
import { MenuItem, MenuOption } from './restaurant';

/** 주문 상태 */
export type OrderStatus = 
  | 'pending'           // 주문 대기
  | 'confirmed'         // 주문 확인
  | 'preparing'         // 조리 중
  | 'ready_for_pickup'  // 픽업 대기
  | 'picked_up'         // 픽업 완료
  | 'delivering'        // 배달 중
  | 'delivered'         // 배달 완료
  | 'cancelled'         // 주문 취소
  | 'refunded';         // 환불 완료

/** 주문 타입 */
export type OrderType = 'delivery' | 'pickup' | 'dine_in';

/** 주문 정보 */
export interface Order extends BaseEntity {
  /** 주문 번호 */
  orderNumber: string;
  /** 고객 ID */
  customerId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 배달기사 ID */
  driverId?: string;
  /** 주문 상태 */
  status: OrderStatus;
  /** 주문 타입 */
  type: OrderType;
  /** 주문 아이템들 */
  items: OrderItem[];
  /** 소계 (상품 금액 합계) */
  subtotal: number;
  /** 배달비 */
  deliveryFee: number;
  /** 할인 금액 */
  discountAmount: number;
  /** 쿠폰 할인 금액 */
  couponDiscountAmount: number;
  /** 세금 */
  tax: number;
  /** 최종 결제 금액 */
  totalAmount: number;
  /** 결제 정보 */
  payment: OrderPayment;
  /** 배달 주소 */
  deliveryAddress?: Address;
  /** 배달 요청사항 */
  deliveryInstructions?: string;
  /** 주문 요청사항 */
  orderNotes?: string;
  /** 예상 조리 시간 (분) */
  estimatedPreparationTime: number;
  /** 예상 배달 시간 */
  estimatedDeliveryTime?: Date;
  /** 실제 배달 시간 */
  actualDeliveryTime?: Date;
  /** 주문 확인 시간 */
  confirmedAt?: Date;
  /** 조리 시작 시간 */
  preparationStartedAt?: Date;
  /** 조리 완료 시간 */
  preparationCompletedAt?: Date;
  /** 픽업 시간 */
  pickedUpAt?: Date;
  /** 배달 완료 시간 */
  deliveredAt?: Date;
  /** 취소 시간 */
  cancelledAt?: Date;
  /** 취소 사유 */
  cancellationReason?: string;
  /** 적용된 쿠폰 ID */
  appliedCouponId?: string;
  /** 리뷰 작성 여부 */
  isReviewed: boolean;
  /** 환불 요청 여부 */
  refundRequested: boolean;
  /** 환불 사유 */
  refundReason?: string;
}

/** 주문 아이템 */
export interface OrderItem extends BaseEntity {
  /** 주문 ID */
  orderId: string;
  /** 메뉴 아이템 ID */
  menuItemId: string;
  /** 메뉴 아이템 정보 (주문 시점 스냅샷) */
  menuItem: OrderMenuItemSnapshot;
  /** 수량 */
  quantity: number;
  /** 선택된 옵션들 */
  selectedOptions: OrderItemOption[];
  /** 아이템 단가 */
  unitPrice: number;
  /** 옵션 추가 금액 */
  optionsPrice: number;
  /** 총 가격 (단가 + 옵션 가격) * 수량 */
  totalPrice: number;
  /** 특별 요청사항 */
  specialInstructions?: string;
}

/** 주문 아이템 옵션 */
export interface OrderItemOption {
  /** 옵션 그룹 ID */
  optionGroupId: string;
  /** 옵션 그룹명 */
  optionGroupName: string;
  /** 옵션 ID */
  optionId: string;
  /** 옵션명 */
  optionName: string;
  /** 추가 가격 */
  additionalPrice: number;
}

/** 주문 시점의 메뉴 아이템 스냅샷 */
export interface OrderMenuItemSnapshot {
  /** 메뉴 아이템 ID */
  id: string;
  /** 메뉴명 */
  name: string;
  /** 메뉴 설명 */
  description: string;
  /** 기본 가격 */
  price: number;
  /** 메뉴 이미지 URL */
  imageUrl?: string;
}

/** 주문 결제 정보 */
export interface OrderPayment {
  /** 결제 방식 */
  method: OrderPaymentMethod;
  /** 결제 상태 */
  status: OrderPaymentStatus;
  /** 결제 고유 ID */
  transactionId?: string;
  /** PG사 거래 ID */
  pgTransactionId?: string;
  /** 결제 승인 시간 */
  paidAt?: Date;
  /** 결제 실패 사유 */
  failureReason?: string;
}

/** 결제 방식 */
export type OrderPaymentMethod = 
  | 'credit_card'     // 신용카드
  | 'debit_card'      // 체크카드
  | 'bank_transfer'   // 계좌이체
  | 'mobile_payment'  // 모바일 결제 (카카오페이, 네이버페이 등)
  | 'cash_on_delivery' // 현금 결제
  | 'digital_wallet'; // 디지털 지갑

/** 결제 상태 */
export type OrderPaymentStatus = 
  | 'pending'         // 결제 대기
  | 'processing'      // 결제 처리 중
  | 'completed'       // 결제 완료
  | 'failed'          // 결제 실패
  | 'cancelled'       // 결제 취소
  | 'refunded'        // 환불 완료
  | 'partially_refunded'; // 부분 환불

/** 장바구니 */
export interface Cart {
  /** 고객 ID */
  customerId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 장바구니 아이템들 */
  items: CartItem[];
  /** 소계 */
  subtotal: number;
  /** 예상 배달비 */
  estimatedDeliveryFee: number;
  /** 예상 총액 */
  estimatedTotal: number;
  /** 최종 업데이트 시간 */
  updatedAt: Date;
}

/** 장바구니 아이템 */
export interface CartItem {
  /** 임시 ID */
  id: string;
  /** 메뉴 아이템 ID */
  menuItemId: string;
  /** 메뉴 아이템 정보 */
  menuItem: MenuItem;
  /** 수량 */
  quantity: number;
  /** 선택된 옵션들 */
  selectedOptions: CartItemOption[];
  /** 아이템 단가 */
  unitPrice: number;
  /** 옵션 추가 금액 */
  optionsPrice: number;
  /** 총 가격 */
  totalPrice: number;
  /** 특별 요청사항 */
  specialInstructions?: string;
  /** 추가된 시간 */
  addedAt: Date;
}

/** 장바구니 아이템 옵션 */
export interface CartItemOption {
  /** 옵션 그룹 ID */
  optionGroupId: string;
  /** 옵션 그룹명 */
  optionGroupName: string;
  /** 옵션 정보 */
  option: MenuOption;
  /** 선택됨 여부 */
  isSelected: boolean;
}

/** 주문 생성 요청 */
export interface CreateOrderRequest {
  /** 음식점 ID */
  restaurantId: string;
  /** 주문 타입 */
  type: OrderType;
  /** 주문 아이템들 */
  items: CreateOrderItemRequest[];
  /** 배달 주소 ID (배달 주문인 경우) */
  deliveryAddressId?: string;
  /** 배달 요청사항 */
  deliveryInstructions?: string;
  /** 주문 요청사항 */
  orderNotes?: string;
  /** 결제 방식 */
  paymentMethod: OrderPaymentMethod;
  /** 적용할 쿠폰 ID */
  couponId?: string;
}

/** 주문 아이템 생성 요청 */
export interface CreateOrderItemRequest {
  /** 메뉴 아이템 ID */
  menuItemId: string;
  /** 수량 */
  quantity: number;
  /** 선택된 옵션들 */
  selectedOptions: {
    optionGroupId: string;
    optionId: string;
  }[];
  /** 특별 요청사항 */
  specialInstructions?: string;
}

/** 주문 검색 필터 */
export interface OrderSearchFilter {
  /** 주문 번호 */
  orderNumber?: string;
  /** 고객 ID */
  customerId?: string;
  /** 음식점 ID */
  restaurantId?: string;
  /** 배달기사 ID */
  driverId?: string;
  /** 주문 상태들 */
  statuses?: OrderStatus[];
  /** 주문 타입들 */
  types?: OrderType[];
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
  /** 최소 주문 금액 */
  minAmount?: number;
  /** 최대 주문 금액 */
  maxAmount?: number;
  /** 정렬 방식 */
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
}

/** 주문 상태 업데이트 요청 */
export interface UpdateOrderStatusRequest {
  /** 새로운 상태 */
  status: OrderStatus;
  /** 상태 변경 메모 */
  memo?: string;
  /** 예상 시간 (해당하는 경우) */
  estimatedTime?: Date;
}

/** 주문 취소 요청 */
export interface CancelOrderRequest {
  /** 취소 사유 */
  reason: string;
  /** 환불 여부 */
  requestRefund: boolean;
}

/** 주문 리뷰 */
export interface OrderReview extends BaseEntity {
  /** 주문 ID */
  orderId: string;
  /** 고객 ID */
  customerId: string;
  /** 음식점 ID */
  restaurantId: string;
  /** 배달기사 ID */
  driverId?: string;
  /** 음식 평점 (1-5) */
  foodRating: number;
  /** 서비스 평점 (1-5) */
  serviceRating: number;
  /** 배달 평점 (1-5) */
  deliveryRating?: number;
  /** 전체 평점 (1-5) */
  overallRating: number;
  /** 리뷰 내용 */
  comment?: string;
  /** 리뷰 이미지들 */
  images?: string[];
  /** 추천 여부 */
  isRecommended: boolean;
  /** 도움이 됨 카운트 */
  helpfulCount: number;
} 