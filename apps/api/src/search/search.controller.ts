/**
 * 레스토랑 검색 컨트롤러
 * 
 * 고객용 레스토랑 검색 REST API 엔드포인트를 제공합니다.
 */

import {
  Controller,
  Get,
  Query,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RestaurantSearchService } from './services/restaurant-search.service';
import { 
  RestaurantSearchDto,
  SortOption,
  SortDirection,
  PriceRange,
  BusinessStatusFilter
} from './dto/restaurant-search.dto';
import { 
  RestaurantSearchResponseDto,
  AutocompleteResponseDto
} from './dto/restaurant-search-response.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly restaurantSearchService: RestaurantSearchService,
  ) {}

  @Get('restaurants')
  @ApiOperation({ 
    summary: '레스토랑 검색', 
    description: '위치 기반 레스토랑 검색 및 필터링을 수행합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '검색 성공',
    type: RestaurantSearchResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: '잘못된 검색 파라미터' 
  })
  @ApiResponse({ 
    status: HttpStatus.INTERNAL_SERVER_ERROR, 
    description: '서버 오류' 
  })
  @ApiQuery({ 
    name: 'keyword', 
    required: false, 
    description: '검색 키워드 (레스토랑명, 메뉴명, 주소)', 
    example: '치킨' 
  })
  @ApiQuery({ 
    name: 'latitude', 
    required: false, 
    description: '사용자 위치 위도', 
    example: 37.5665 
  })
  @ApiQuery({ 
    name: 'longitude', 
    required: false, 
    description: '사용자 위치 경도', 
    example: 126.9780 
  })
  @ApiQuery({ 
    name: 'radius', 
    required: false, 
    description: '검색 반경 (km)', 
    example: 5 
  })
  @ApiQuery({ 
    name: 'categoryIds', 
    required: false, 
    description: '카테고리 ID 목록 (쉼표로 구분)', 
    example: 'category1,category2' 
  })
  @ApiQuery({ 
    name: 'priceRange', 
    required: false, 
    enum: PriceRange, 
    description: '가격대 필터' 
  })
  @ApiQuery({ 
    name: 'minRating', 
    required: false, 
    description: '최소 평점', 
    example: 4.0 
  })
  @ApiQuery({ 
    name: 'maxDeliveryFee', 
    required: false, 
    description: '최대 배달비 (원)', 
    example: 3000 
  })
  @ApiQuery({ 
    name: 'maxDeliveryTime', 
    required: false, 
    description: '최대 배달 시간 (분)', 
    example: 30 
  })
  @ApiQuery({ 
    name: 'businessStatus', 
    required: false, 
    enum: BusinessStatusFilter, 
    description: '영업 상태 필터' 
  })
  @ApiQuery({ 
    name: 'deliveryAvailable', 
    required: false, 
    description: '배달 가능 여부', 
    type: Boolean 
  })
  @ApiQuery({ 
    name: 'pickupAvailable', 
    required: false, 
    description: '픽업 가능 여부', 
    type: Boolean 
  })
  @ApiQuery({ 
    name: 'hasPromotion', 
    required: false, 
    description: '프로모션 적용 레스토랑만', 
    type: Boolean 
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    enum: SortOption, 
    description: '정렬 기준' 
  })
  @ApiQuery({ 
    name: 'sortDirection', 
    required: false, 
    enum: SortDirection, 
    description: '정렬 방향' 
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: '페이지 번호', 
    example: 1 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: '페이지당 항목 수', 
    example: 20 
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchRestaurants(@Query() searchDto: RestaurantSearchDto): Promise<RestaurantSearchResponseDto> {
    // 위치 정보 변환 (latitude, longitude가 별개 쿼리 파라미터로 전달되는 경우)
    if (searchDto['latitude'] && searchDto['longitude']) {
      searchDto.location = {
        latitude: parseFloat(searchDto['latitude']),
        longitude: parseFloat(searchDto['longitude'])
      };
    }

    return this.restaurantSearchService.searchRestaurants(searchDto);
  }

  @Get('autocomplete')
  @ApiOperation({ 
    summary: '자동완성 검색', 
    description: '검색어 자동완성 제안을 제공합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '자동완성 검색 성공',
    type: AutocompleteResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: '잘못된 검색 파라미터' 
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: '검색 쿼리', 
    example: '치' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: '최대 제안 수', 
    example: 10 
  })
  async getAutocompleteSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 10
  ): Promise<AutocompleteResponseDto> {
    return this.restaurantSearchService.getAutocompleteSuggestions(query, limit);
  }

  @Get('popular-keywords')
  @ApiOperation({ 
    summary: '인기 검색어 조회', 
    description: '현재 인기 있는 검색어 목록을 제공합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '인기 검색어 조회 성공'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: '조회할 인기 검색어 수', 
    example: 10 
  })
  async getPopularKeywords(@Query('limit') limit: number = 10) {
    // 향후 구현 예정: 실제 검색 로그 기반 인기 검색어
    return {
      success: true,
      message: '인기 검색어 조회 성공',
      data: [
        { keyword: '치킨', searchCount: 1234, rank: 1 },
        { keyword: '피자', searchCount: 987, rank: 2 },
        { keyword: '족발', searchCount: 765, rank: 3 },
        { keyword: '중국집', searchCount: 654, rank: 4 },
        { keyword: '버거', searchCount: 543, rank: 5 },
        { keyword: '초밥', searchCount: 432, rank: 6 },
        { keyword: '파스타', searchCount: 321, rank: 7 },
        { keyword: '보쌈', searchCount: 210, rank: 8 },
        { keyword: '떡볶이', searchCount: 199, rank: 9 },
        { keyword: '삼겹살', searchCount: 188, rank: 10 }
      ].slice(0, limit),
      timestamp: new Date()
    };
  }

  @Get('recent-keywords')
  @ApiOperation({ 
    summary: '최근 검색어 조회', 
    description: '사용자의 최근 검색어 목록을 제공합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '최근 검색어 조회 성공'
  })
  @ApiQuery({ 
    name: 'userId', 
    required: false, 
    description: '사용자 ID (인증된 사용자의 경우)' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: '조회할 최근 검색어 수', 
    example: 10 
  })
  async getRecentKeywords(
    @Query('userId') userId?: string,
    @Query('limit') limit: number = 10
  ) {
    // 향후 구현 예정: 사용자별 최근 검색어 저장/조회
    return {
      success: true,
      message: '최근 검색어 조회 성공',
      data: [
        { keyword: '마라탕', searchedAt: new Date(Date.now() - 1000 * 60 * 10) }, // 10분 전
        { keyword: '김치찌개', searchedAt: new Date(Date.now() - 1000 * 60 * 30) }, // 30분 전
        { keyword: '돈까스', searchedAt: new Date(Date.now() - 1000 * 60 * 60) }, // 1시간 전
        { keyword: '짜장면', searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2) }, // 2시간 전
        { keyword: '냉면', searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 5) }, // 5시간 전
      ].slice(0, limit),
      timestamp: new Date()
    };
  }

  @Get('suggested-keywords')
  @ApiOperation({ 
    summary: '추천 검색어 조회', 
    description: '개인화된 추천 검색어를 제공합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '추천 검색어 조회 성공'
  })
  @ApiQuery({ 
    name: 'userId', 
    required: false, 
    description: '사용자 ID (개인화 추천을 위해)' 
  })
  @ApiQuery({ 
    name: 'latitude', 
    required: false, 
    description: '사용자 위치 위도 (지역 기반 추천을 위해)' 
  })
  @ApiQuery({ 
    name: 'longitude', 
    required: false, 
    description: '사용자 위치 경도 (지역 기반 추천을 위해)' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: '조회할 추천 검색어 수', 
    example: 10 
  })
  async getSuggestedKeywords(
    @Query('userId') userId?: string,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('limit') limit: number = 10
  ) {
    // 향후 구현 예정: 사용자 위치, 주문 기록, 선호도 기반 추천 검색어
    return {
      success: true,
      message: '추천 검색어 조회 성공',
      data: [
        { keyword: '치킨', type: 'popular', restaurantCount: 45 },
        { keyword: '24시간', type: 'category', restaurantCount: 23 },
        { keyword: '한식', type: 'category', restaurantCount: 78 },
        { keyword: '무료배달', type: 'popular', restaurantCount: 34 },
        { keyword: '빠른배달', type: 'popular', restaurantCount: 67 },
      ].slice(0, limit),
      timestamp: new Date()
    };
  }

  @Get('filters')
  @ApiOperation({ 
    summary: '검색 필터 옵션 조회', 
    description: '사용 가능한 검색 필터 옵션들을 제공합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '필터 옵션 조회 성공'
  })
  async getFilterOptions() {
    return {
      success: true,
      message: '필터 옵션 조회 성공',
      data: {
        sortOptions: Object.values(SortOption),
        sortDirections: Object.values(SortDirection),
        priceRanges: Object.values(PriceRange),
        businessStatusFilters: Object.values(BusinessStatusFilter),
        radiusOptions: [1, 3, 5, 10, 20, 30, 50], // km
        deliveryTimeOptions: [15, 30, 45, 60, 90], // minutes
        deliveryFeeOptions: [0, 1000, 2000, 3000, 5000], // won
        ratingOptions: [3.0, 3.5, 4.0, 4.5] // minimum ratings
      },
      timestamp: new Date()
    };
  }
} 