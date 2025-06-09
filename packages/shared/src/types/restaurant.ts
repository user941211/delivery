/**
 * 음식점 관련 타입 정의
 * 
 * 음식점, 메뉴, 카테고리 등 음식점 운영에 필요한 모든 타입을 정의합니다.
 */

import { BaseEntity, Address, ContactInfo, BusinessHours, Rating, FileInfo } from './base';

/** 음식점 상태 */
export type RestaurantStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';

/** 배달 타입 */
export type DeliveryType = 'delivery' | 'pickup' | 'dine_in';

/** 음식점 정보 */
export interface Restaurant extends BaseEntity {
  /** 음식점명 */
  name: string;
  /** 음식점 설명 */
  description: string;
  /** 사업자 등록번호 */
  businessRegistrationNumber: string;
  /** 음식점 사장 ID */
  ownerId: string;
  /** 주소 정보 */
  address: Address;
  /** 연락처 정보 */
  contact: ContactInfo;
  /** 음식점 상태 */
  status: RestaurantStatus;
  /** 음식점 이미지들 */
  images: FileInfo[];
  /** 대표 이미지 URL */
  thumbnailUrl: string;
  /** 평점 정보 */
  rating: Rating;
  /** 영업 시간 */
  businessHours: BusinessHours[];
  /** 배달 가능 타입 */
  deliveryTypes: DeliveryType[];
  /** 최소 주문 금액 */
  minimumOrderAmount: number;
  /** 배달비 */
  deliveryFee: number;
  /** 배달 가능 거리 (km) */
  deliveryRadius: number;
  /** 예상 조리 시간 (분) */
  preparationTime: number;
  /** 음식 카테고리 */
  categories: RestaurantCategory[];
  /** 메뉴 카테고리들 */
  menuCategories: MenuCategory[];
  /** 특별 정보 */
  specialInfo?: {
    /** 할랄 인증 */
    isHalal?: boolean;
    /** 비건 옵션 */
    hasVeganOptions?: boolean;
    /** 글루텐 프리 옵션 */
    hasGlutenFreeOptions?: boolean;
    /** 주차 가능 */
    hasParkingSpace?: boolean;
    /** 예약 가능 */
    acceptsReservations?: boolean;
  };
  /** 프로모션 정보 */
  promotions: RestaurantPromotion[];
  /** 총 주문 수 */
  totalOrders: number;
  /** 이번 달 주문 수 */
  monthlyOrders: number;
  /** 가입일 */
  joinedAt: Date;
}

/** 음식점 카테고리 */
export interface RestaurantCategory {
  /** 카테고리 ID */
  id: string;
  /** 카테고리명 */
  name: string;
  /** 카테고리 설명 */
  description?: string;
  /** 카테고리 아이콘 URL */
  iconUrl?: string;
  /** 정렬 순서 */
  sortOrder: number;
}

/** 메뉴 카테고리 */
export interface MenuCategory extends BaseEntity {
  /** 음식점 ID */
  restaurantId: string;
  /** 카테고리명 */
  name: string;
  /** 카테고리 설명 */
  description?: string;
  /** 정렬 순서 */
  sortOrder: number;
  /** 활성화 여부 */
  isActive: boolean;
  /** 메뉴 아이템들 */
  menuItems: MenuItem[];
}

/** 메뉴 아이템 */
export interface MenuItem extends BaseEntity {
  /** 음식점 ID */
  restaurantId: string;
  /** 메뉴 카테고리 ID */
  categoryId: string;
  /** 메뉴명 */
  name: string;
  /** 메뉴 설명 */
  description: string;
  /** 가격 */
  price: number;
  /** 할인 가격 */
  discountPrice?: number;
  /** 메뉴 이미지들 */
  images: FileInfo[];
  /** 대표 이미지 URL */
  thumbnailUrl?: string;
  /** 활성화 여부 */
  isActive: boolean;
  /** 재고 여부 */
  isAvailable: boolean;
  /** 품절 여부 */
  isOutOfStock: boolean;
  /** 정렬 순서 */
  sortOrder: number;
  /** 칼로리 정보 */
  calories?: number;
  /** 알레르기 정보 */
  allergens: Allergen[];
  /** 영양 정보 */
  nutritionInfo?: NutritionInfo;
  /** 메뉴 옵션 그룹들 */
  optionGroups: MenuOptionGroup[];
  /** 인기 메뉴 여부 */
  isPopular: boolean;
  /** 추천 메뉴 여부 */
  isRecommended: boolean;
  /** 신메뉴 여부 */
  isNew: boolean;
  /** 매운맛 단계 (0-5) */
  spicyLevel?: number;
}

/** 메뉴 옵션 그룹 */
export interface MenuOptionGroup extends BaseEntity {
  /** 메뉴 아이템 ID */
  menuItemId: string;
  /** 옵션 그룹명 */
  name: string;
  /** 필수 선택 여부 */
  isRequired: boolean;
  /** 다중 선택 허용 여부 */
  allowMultiple: boolean;
  /** 최소 선택 개수 */
  minSelections: number;
  /** 최대 선택 개수 */
  maxSelections: number;
  /** 정렬 순서 */
  sortOrder: number;
  /** 옵션들 */
  options: MenuOption[];
}

/** 메뉴 옵션 */
export interface MenuOption extends BaseEntity {
  /** 옵션 그룹 ID */
  optionGroupId: string;
  /** 옵션명 */
  name: string;
  /** 추가 가격 */
  additionalPrice: number;
  /** 활성화 여부 */
  isActive: boolean;
  /** 정렬 순서 */
  sortOrder: number;
}

/** 알레르기 유발 요소 */
export type Allergen = 
  | 'eggs'          // 달걀
  | 'milk'          // 우유
  | 'buckwheat'     // 메밀
  | 'peanuts'       // 땅콩
  | 'soybeans'      // 대두
  | 'wheat'         // 밀
  | 'mackerel'      // 고등어
  | 'crab'          // 게
  | 'shrimp'        // 새우
  | 'pork'          // 돼지고기
  | 'peach'         // 복숭아
  | 'tomato'        // 토마토
  | 'sulfites'      // 아황산류
  | 'walnut'        // 호두
  | 'chicken'       // 닭고기
  | 'beef'          // 쇠고기
  | 'squid'         // 오징어
  | 'shellfish'     // 조개류
  | 'pine_nuts';    // 잣

/** 영양 정보 */
export interface NutritionInfo {
  /** 칼로리 */
  calories: number;
  /** 단백질 (g) */
  protein: number;
  /** 탄수화물 (g) */
  carbohydrate: number;
  /** 지방 (g) */
  fat: number;
  /** 나트륨 (mg) */
  sodium: number;
  /** 당분 (g) */
  sugar: number;
  /** 콜레스테롤 (mg) */
  cholesterol?: number;
  /** 포화지방 (g) */
  saturatedFat?: number;
}

/** 음식점 프로모션 */
export interface RestaurantPromotion extends BaseEntity {
  /** 음식점 ID */
  restaurantId: string;
  /** 프로모션명 */
  title: string;
  /** 프로모션 설명 */
  description: string;
  /** 프로모션 타입 */
  type: PromotionType;
  /** 할인 값 */
  discountValue: number;
  /** 할인 타입 */
  discountType: 'percentage' | 'fixed';
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
}

/** 프로모션 타입 */
export type PromotionType = 
  | 'discount'      // 할인
  | 'free_delivery' // 무료배달
  | 'buy_one_get_one' // 1+1
  | 'free_item'     // 무료 제품
  | 'bundle_deal';  // 세트 할인

/** 음식점 검색 필터 */
export interface RestaurantSearchFilter {
  /** 검색 키워드 */
  search?: string;
  /** 카테고리 ID들 */
  categoryIds?: string[];
  /** 최소 평점 */
  minRating?: number;
  /** 최대 배달비 */
  maxDeliveryFee?: number;
  /** 배달 타입 */
  deliveryTypes?: DeliveryType[];
  /** 현재 영업 중만 */
  openNow?: boolean;
  /** 프로모션 진행 중만 */
  hasPromotions?: boolean;
  /** 위치 기반 필터 */
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // km
  };
  /** 정렬 방식 */
  sortBy?: 'rating' | 'deliveryTime' | 'deliveryFee' | 'distance' | 'popularity';
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
}

/** 음식점 생성 요청 */
export interface CreateRestaurantRequest {
  /** 음식점명 */
  name: string;
  /** 음식점 설명 */
  description: string;
  /** 사업자 등록번호 */
  businessRegistrationNumber: string;
  /** 주소 정보 */
  address: Address;
  /** 연락처 정보 */
  contact: ContactInfo;
  /** 음식점 이미지들 */
  images?: FileInfo[];
  /** 영업 시간 */
  businessHours: BusinessHours[];
  /** 배달 가능 타입 */
  deliveryTypes: DeliveryType[];
  /** 최소 주문 금액 */
  minimumOrderAmount: number;
  /** 배달비 */
  deliveryFee: number;
  /** 배달 가능 거리 */
  deliveryRadius: number;
  /** 예상 조리 시간 */
  preparationTime: number;
  /** 음식 카테고리 ID들 */
  categoryIds: string[];
}

/** 음식점 업데이트 요청 */
export interface UpdateRestaurantRequest {
  /** 음식점명 */
  name?: string;
  /** 음식점 설명 */
  description?: string;
  /** 연락처 정보 */
  contact?: ContactInfo;
  /** 영업 시간 */
  businessHours?: BusinessHours[];
  /** 배달 가능 타입 */
  deliveryTypes?: DeliveryType[];
  /** 최소 주문 금액 */
  minimumOrderAmount?: number;
  /** 배달비 */
  deliveryFee?: number;
  /** 배달 가능 거리 */
  deliveryRadius?: number;
  /** 예상 조리 시간 */
  preparationTime?: number;
} 