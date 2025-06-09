/**
 * 레스토랑 검색 결과 응답 DTO
 * 
 * 검색 결과를 클라이언트에 전달하기 위한 응답 형식을 정의합니다.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 거리 정보 DTO
 */
export class DistanceInfoDto {
  @ApiProperty({ description: '거리 (km)', example: 1.2 })
  distance: number;

  @ApiProperty({ description: '예상 배달 시간 (분)', example: 25 })
  estimatedDeliveryTime: number;

  @ApiProperty({ description: '배달비 (원)', example: 3000 })
  deliveryFee: number;
}

/**
 * 레스토랑 평점 정보 DTO
 */
export class RatingInfoDto {
  @ApiProperty({ description: '평균 평점', example: 4.5 })
  averageRating: number;

  @ApiProperty({ description: '총 리뷰 수', example: 1234 })
  totalReviews: number;

  @ApiProperty({ description: '평점 분포 (1점부터 5점까지)', example: [10, 20, 50, 200, 964] })
  ratingDistribution: number[];
}

/**
 * 영업 상태 정보 DTO
 */
export class BusinessStatusDto {
  @ApiProperty({ description: '현재 영업 중 여부', example: true })
  isOpen: boolean;

  @ApiProperty({ description: '오늘 영업 시간', example: '09:00 - 22:00' })
  todayHours: string;

  @ApiPropertyOptional({ description: '다음 영업 시작 시간 (영업 종료 시)', example: '2024-01-16T09:00:00.000Z' })
  nextOpenTime?: Date;

  @ApiProperty({ description: '영업 상태 메시지', example: '영업 중' })
  statusMessage: string;
}

/**
 * 레스토랑 이미지 정보 DTO
 */
export class RestaurantImageDto {
  @ApiProperty({ description: '이미지 ID', example: 'img_123' })
  id: string;

  @ApiProperty({ description: '이미지 URL', example: 'https://example.com/images/restaurant1.jpg' })
  url: string;

  @ApiPropertyOptional({ description: '썸네일 URL', example: 'https://example.com/images/restaurant1_thumb.jpg' })
  thumbnailUrl?: string;

  @ApiProperty({ description: '대표 이미지 여부', example: true })
  isPrimary: boolean;

  @ApiPropertyOptional({ description: '이미지 설명', example: '매장 외관' })
  altText?: string;
}

/**
 * 프로모션 정보 DTO
 */
export class PromotionInfoDto {
  @ApiProperty({ description: '프로모션 ID', example: 'promo_123' })
  id: string;

  @ApiProperty({ description: '프로모션 제목', example: '20% 할인' })
  title: string;

  @ApiProperty({ description: '프로모션 설명', example: '전 메뉴 20% 할인 (최대 5,000원)' })
  description: string;

  @ApiProperty({ description: '할인 유형', example: 'percentage' })
  discountType: 'percentage' | 'fixed' | 'free_delivery';

  @ApiProperty({ description: '할인 값', example: 20 })
  discountValue: number;

  @ApiProperty({ description: '프로모션 종료일', example: '2024-01-31T23:59:59.000Z' })
  endDate: Date;
}

/**
 * 검색된 레스토랑 정보 DTO
 */
export class SearchedRestaurantDto {
  @ApiProperty({ description: '레스토랑 ID', example: 'rest_123' })
  id: string;

  @ApiProperty({ description: '레스토랑명', example: '맛있는 치킨집' })
  name: string;

  @ApiProperty({ description: '레스토랑 설명', example: '바삭한 치킨 전문점' })
  description: string;

  @ApiProperty({ description: '주소', example: '서울시 강남구 테헤란로 123' })
  address: string;

  @ApiPropertyOptional({ description: '상세 주소', example: '1층' })
  addressDetail?: string;

  @ApiProperty({ description: '전화번호', example: '02-1234-5678' })
  phone: string;

  @ApiProperty({ description: '카테고리 정보', type: [String], example: ['치킨', '한식'] })
  categories: string[];

  @ApiProperty({ description: '거리 및 배달 정보', type: DistanceInfoDto })
  @Type(() => DistanceInfoDto)
  distanceInfo: DistanceInfoDto;

  @ApiProperty({ description: '평점 정보', type: RatingInfoDto })
  @Type(() => RatingInfoDto)
  ratingInfo: RatingInfoDto;

  @ApiProperty({ description: '영업 상태 정보', type: BusinessStatusDto })
  @Type(() => BusinessStatusDto)
  businessStatus: BusinessStatusDto;

  @ApiProperty({ description: '레스토랑 이미지', type: [RestaurantImageDto] })
  @Type(() => RestaurantImageDto)
  images: RestaurantImageDto[];

  @ApiPropertyOptional({ description: '적용 가능한 프로모션', type: [PromotionInfoDto] })
  @Type(() => PromotionInfoDto)
  promotions?: PromotionInfoDto[];

  @ApiProperty({ description: '배달 가능 여부', example: true })
  deliveryAvailable: boolean;

  @ApiProperty({ description: '픽업 가능 여부', example: true })
  pickupAvailable: boolean;

  @ApiProperty({ description: '최소 주문 금액 (원)', example: 15000 })
  minimumOrderAmount: number;

  @ApiProperty({ description: '예상 조리 시간 (분)', example: 20 })
  preparationTime: number;

  @ApiProperty({ description: '인기도 점수', example: 85 })
  popularityScore: number;

  @ApiProperty({ description: '레스토랑 등록일', example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '검색 관련성 점수', example: 0.95 })
  relevanceScore: number;
}

/**
 * 페이지네이션 정보 DTO
 */
export class PaginationInfoDto {
  @ApiProperty({ description: '현재 페이지', example: 1 })
  currentPage: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  itemsPerPage: number;

  @ApiProperty({ description: '총 항목 수', example: 156 })
  totalItems: number;

  @ApiProperty({ description: '총 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPreviousPage: boolean;
}

/**
 * 검색 통계 정보 DTO
 */
export class SearchStatsDto {
  @ApiProperty({ description: '총 검색 결과 수', example: 156 })
  totalResults: number;

  @ApiProperty({ description: '검색 처리 시간 (ms)', example: 125 })
  searchTime: number;

  @ApiProperty({ description: '적용된 필터 수', example: 3 })
  appliedFilters: number;

  @ApiProperty({ description: '검색 지역', example: '강남구' })
  searchRegion: string;
}

/**
 * 검색 필터 정보 DTO
 */
export class SearchFiltersDto {
  @ApiProperty({ description: '적용된 필터', example: { keyword: '치킨', minRating: 4.0 } })
  appliedFilters: Record<string, any>;

  @ApiProperty({ description: '사용 가능한 필터 옵션' })
  availableFilters: Record<string, any>;
}

/**
 * 레스토랑 검색 결과 응답 DTO (RestaurantSearchService와 일치하는 구조)
 */
export class RestaurantSearchResponseDto {
  @ApiProperty({ description: '검색된 레스토랑 목록', type: [SearchedRestaurantDto] })
  @Type(() => SearchedRestaurantDto)
  restaurants: SearchedRestaurantDto[];

  @ApiProperty({ description: '총 검색 결과 수', example: 156 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  limit: number;

  @ApiProperty({ description: '총 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPreviousPage: boolean;

  @ApiProperty({ description: '검색 필터 정보', type: SearchFiltersDto })
  @Type(() => SearchFiltersDto)
  filters: SearchFiltersDto;

  @ApiProperty({ description: '검색 처리 시간 (ms)', example: 125 })
  searchTime: number;

  @ApiPropertyOptional({ description: '캐시 키' })
  cacheKey?: string;
}

/**
 * 자동완성 검색 결과 DTO
 */
export class AutocompleteResultDto {
  @ApiProperty({ description: '제안 텍스트', example: '치킨' })
  text: string;

  @ApiProperty({ description: '제안 유형', example: 'restaurant' })
  type: 'restaurant' | 'menu' | 'category' | 'location';

  @ApiProperty({ description: '매칭 점수', example: 0.95 })
  score: number;

  @ApiPropertyOptional({ description: '추가 정보 (카테고리명, 지역명 등)', example: '강남구' })
  metadata?: string;
}

/**
 * 자동완성 응답 DTO
 */
export class AutocompleteResponseDto {
  @ApiProperty({ description: '자동완성 결과', type: [AutocompleteResultDto] })
  @Type(() => AutocompleteResultDto)
  suggestions: AutocompleteResultDto[];

  @ApiProperty({ description: '검색어', example: '치' })
  query: string;

  @ApiProperty({ description: '응답 생성 시간', example: '2024-01-15T10:30:00.000Z' })
  timestamp: Date;
} 