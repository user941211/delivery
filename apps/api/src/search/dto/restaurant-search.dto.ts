/**
 * 레스토랑 검색 DTO
 * 
 * 고객용 레스토랑 검색 및 필터링을 위한 데이터 전송 객체입니다.
 */

import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsArray, Min, Max, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * 정렬 옵션 열거형
 */
export enum SortOption {
  DISTANCE = 'distance',           // 거리 순
  RATING = 'rating',              // 평점 순
  REVIEW_COUNT = 'review_count',   // 리뷰 개수 순
  DELIVERY_TIME = 'delivery_time', // 배달 시간 순
  DELIVERY_FEE = 'delivery_fee',   // 배달비 순
  POPULARITY = 'popularity',       // 인기 순
  NEWEST = 'newest',              // 최신 순
}

/**
 * 정렬 방향 열거형
 */
export enum SortDirection {
  ASC = 'asc',   // 오름차순
  DESC = 'desc', // 내림차순
}

/**
 * 가격대 범위 열거형
 */
export enum PriceRange {
  BUDGET = 'budget',       // 저렴한 (10,000원 이하)
  MODERATE = 'moderate',   // 보통 (10,000원 - 20,000원)
  EXPENSIVE = 'expensive', // 비싼 (20,000원 - 30,000원)
  PREMIUM = 'premium',     // 고급 (30,000원 이상)
}

/**
 * 레스토랑 영업 상태 필터
 */
export enum BusinessStatusFilter {
  OPEN = 'open',           // 영업 중
  CLOSED = 'closed',       // 영업 종료
  OPENING_SOON = 'opening_soon', // 곧 영업 시작
  ALL = 'all',            // 모든 상태
}

/**
 * 위치 정보 DTO
 */
export class LocationDto {
  @ApiProperty({ description: '위도', example: 37.5665 })
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @Min(-90, { message: '위도는 -90 이상이어야 합니다.' })
  @Max(90, { message: '위도는 90 이하여야 합니다.' })
  latitude: number;

  @ApiProperty({ description: '경도', example: 126.9780 })
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다.' })
  @Max(180, { message: '경도는 180 이하여야 합니다.' })
  longitude: number;
}

/**
 * 레스토랑 검색 필터 DTO
 */
export class RestaurantSearchDto {
  @ApiPropertyOptional({ description: '검색 키워드 (레스토랑명, 메뉴명, 주소)', example: '치킨' })
  @IsOptional()
  @IsString({ message: '검색 키워드는 문자열이어야 합니다.' })
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({ description: '사용자 위치', type: LocationDto })
  @IsOptional()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ description: '검색 반경 (km)', example: 5, minimum: 0.1, maximum: 50 })
  @IsOptional()
  @IsNumber({}, { message: '검색 반경은 숫자여야 합니다.' })
  @Min(0.1, { message: '검색 반경은 최소 0.1km 이상이어야 합니다.' })
  @Max(50, { message: '검색 반경은 최대 50km 이하여야 합니다.' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  radius?: number = 10; // 기본값: 10km

  @ApiPropertyOptional({ description: '카테고리 ID 목록', example: ['category1', 'category2'], type: [String] })
  @IsOptional()
  @IsArray({ message: '카테고리는 배열 형태여야 합니다.' })
  @IsString({ each: true, message: '각 카테고리 ID는 문자열이어야 합니다.' })
  @Transform(({ value }) => typeof value === 'string' ? [value] : value)
  categoryIds?: string[];

  @ApiPropertyOptional({ description: '가격대 필터', enum: PriceRange, enumName: 'PriceRange' })
  @IsOptional()
  @IsEnum(PriceRange, { message: '유효한 가격대를 선택해주세요.' })
  priceRange?: PriceRange;

  @ApiPropertyOptional({ description: '최소 평점', example: 4.0, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber({}, { message: '평점은 숫자여야 합니다.' })
  @Min(0, { message: '평점은 0 이상이어야 합니다.' })
  @Max(5, { message: '평점은 5 이하여야 합니다.' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  minRating?: number;

  @ApiPropertyOptional({ description: '최대 배달비 (원)', example: 3000, minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: '배달비는 숫자여야 합니다.' })
  @Min(0, { message: '배달비는 0 이상이어야 합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  maxDeliveryFee?: number;

  @ApiPropertyOptional({ description: '최대 배달 시간 (분)', example: 30, minimum: 1 })
  @IsOptional()
  @IsNumber({}, { message: '배달 시간은 숫자여야 합니다.' })
  @Min(1, { message: '배달 시간은 1분 이상이어야 합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  maxDeliveryTime?: number;

  @ApiPropertyOptional({ description: '최대 최소 주문 금액 (원)', example: 20000, minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: '최소 주문 금액은 숫자여야 합니다.' })
  @Min(0, { message: '최소 주문 금액은 0 이상이어야 합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  maxMinimumOrder?: number;

  @ApiPropertyOptional({ description: '영업 상태 필터', enum: BusinessStatusFilter, enumName: 'BusinessStatusFilter' })
  @IsOptional()
  @IsEnum(BusinessStatusFilter, { message: '유효한 영업 상태를 선택해주세요.' })
  businessStatus?: BusinessStatusFilter = BusinessStatusFilter.ALL;

  @ApiPropertyOptional({ description: '배달 가능 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '배달 가능 여부는 불린 값이어야 합니다.' })
  @Transform(({ value }) => value === 'true' || value === true)
  deliveryAvailable?: boolean;

  @ApiPropertyOptional({ description: '픽업 가능 여부', example: false })
  @IsOptional()
  @IsBoolean({ message: '픽업 가능 여부는 불린 값이어야 합니다.' })
  @Transform(({ value }) => value === 'true' || value === true)
  pickupAvailable?: boolean;

  @ApiPropertyOptional({ description: '프로모션 적용 레스토랑만', example: false })
  @IsOptional()
  @IsBoolean({ message: '프로모션 필터는 불린 값이어야 합니다.' })
  @Transform(({ value }) => value === 'true' || value === true)
  hasPromotion?: boolean;

  @ApiPropertyOptional({ description: '정렬 기준', enum: SortOption, enumName: 'SortOption' })
  @IsOptional()
  @IsEnum(SortOption, { message: '유효한 정렬 기준을 선택해주세요.' })
  sortBy?: SortOption = SortOption.DISTANCE;

  @ApiPropertyOptional({ description: '정렬 방향', enum: SortDirection, enumName: 'SortDirection' })
  @IsOptional()
  @IsEnum(SortDirection, { message: '유효한 정렬 방향을 선택해주세요.' })
  sortDirection?: SortDirection = SortDirection.ASC;

  @ApiPropertyOptional({ description: '정렬 순서 (asc/desc)', example: 'asc' })
  @IsOptional()
  @IsString({ message: '정렬 순서는 문자열이어야 합니다.' })
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: '페이지 번호', example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber({}, { message: '페이지 번호는 숫자여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : 1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber({}, { message: '페이지당 항목 수는 숫자여야 합니다.' })
  @Min(1, { message: '페이지당 항목 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 항목 수는 100 이하여야 합니다.' })
  @Transform(({ value }) => value ? parseInt(value) : 20)
  limit?: number = 20;
}

/**
 * 인기 검색어 응답 DTO
 */
export class PopularKeywordDto {
  @ApiProperty({ description: '검색어', example: '치킨' })
  keyword: string;

  @ApiProperty({ description: '검색 횟수', example: 1234 })
  searchCount: number;

  @ApiProperty({ description: '순위', example: 1 })
  rank: number;
}

/**
 * 최근 검색어 DTO
 */
export class RecentSearchDto {
  @ApiProperty({ description: '검색어', example: '피자' })
  keyword: string;

  @ApiProperty({ description: '검색 일시', example: '2024-01-15T10:30:00.000Z' })
  searchedAt: Date;
}

/**
 * 추천 검색어 DTO
 */
export class SuggestedKeywordDto {
  @ApiProperty({ description: '추천 검색어', example: '치킨' })
  keyword: string;

  @ApiProperty({ description: '추천 유형', example: 'popular' })
  type: 'popular' | 'recent' | 'category';

  @ApiProperty({ description: '매칭된 레스토랑 수', example: 15 })
  restaurantCount: number;
} 