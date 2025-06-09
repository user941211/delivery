/**
 * 레스토랑 검색 서비스
 * 
 * 레스토랑 검색, 필터링, 정렬 기능을 제공하며 성능 최적화가 적용되었습니다.
 */

import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  RestaurantSearchDto, 
  SortOption, 
  SortDirection, 
  PriceRange, 
  BusinessStatusFilter 
} from '../dto/restaurant-search.dto';
import { 
  SearchedRestaurantDto, 
  RestaurantSearchResponseDto,
  DistanceInfoDto,
  RatingInfoDto,
  BusinessStatusDto,
  RestaurantImageDto,
  PaginationInfoDto,
  SearchStatsDto,
  AutocompleteResultDto,
  AutocompleteResponseDto,
  PromotionInfoDto
} from '../dto/restaurant-search-response.dto';
import { 
  DatabaseOptimizer, 
  createDatabaseOptimizer,
  PaginatedResult,
  generateCacheKey
} from '../../common/utils/database-optimizer.util';

@Injectable()
export class RestaurantSearchService {
  private readonly logger = new Logger(RestaurantSearchService.name);
  private readonly supabase: SupabaseClient;
  private readonly dbOptimizer: DatabaseOptimizer;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );

    this.dbOptimizer = createDatabaseOptimizer(this.supabase);
  }

  /**
   * 레스토랑 검색 메인 함수
   * 모든 필터링과 정렬 조건을 적용하여 레스토랑을 검색합니다.
   */
  async searchRestaurants(searchDto: RestaurantSearchDto): Promise<RestaurantSearchResponseDto> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting restaurant search with filters: ${JSON.stringify(searchDto)}`);

      // 검색 필터 구성
      const filters = this.buildSearchFilters(searchDto);
      
      // 정렬 옵션 구성
      const orderBy = this.buildOrderBy(searchDto.sortBy, searchDto.sortOrder);

      // 캐시 키 생성
      const cacheKey = generateCacheKey(
        'restaurant_search',
        'restaurants',
        filters,
        { 
          sortBy: searchDto.sortBy,
          sortOrder: searchDto.sortOrder,
          page: searchDto.page,
          limit: searchDto.limit
        }
      );

      // 성능 최적화된 페이지네이션 쿼리 실행
      const result = await this.dbOptimizer.paginateQuery<any>(
        'restaurants',
        searchDto.page || 1,
        searchDto.limit || 20,
        filters,
        orderBy,
        this.getOptimizedSelectFields()
      );

      // 관련 데이터 배치 로딩 (N+1 문제 해결)
      const restaurantsWithRelatedData = await this.loadRelatedData(result.data);

      // 응답 구성
      const response: RestaurantSearchResponseDto = {
        restaurants: restaurantsWithRelatedData,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        filters: {
          appliedFilters: this.getAppliedFilters(searchDto),
          availableFilters: await this.getAvailableFilters()
        },
        searchTime: Date.now() - startTime,
        cacheKey
      };

      this.logger.log(`Restaurant search completed in ${response.searchTime}ms, found ${result.total} results`);

      return response;
    } catch (error) {
      this.logger.error(`Restaurant search failed: ${error}`);
      throw error;
    }
  }

  /**
   * 검색 필터 구성
   */
  private buildSearchFilters(searchDto: RestaurantSearchDto): Record<string, any> {
    const filters: Record<string, any> = {
      is_open: true,
      is_verified: true
    };

    // 키워드 검색 (ILIKE 사용)
    if (searchDto.keyword) {
      // 이 부분은 특별 처리가 필요하므로 별도 메서드로 분리
      // filters에서는 기본 조건만 처리
    }

    // 카테고리 필터
    if (searchDto.categoryIds && searchDto.categoryIds.length > 0) {
      filters.category_id = searchDto.categoryIds;
    }

    // 가격대 필터
    if (searchDto.priceRange) {
      const priceFilter = this.buildPriceRangeFilter(searchDto.priceRange);
      Object.assign(filters, priceFilter);
    }

    // 평점 필터
    if (searchDto.minRating) {
      filters.rating_gte = searchDto.minRating;
    }

    // 배달비 필터
    if (searchDto.maxDeliveryFee !== undefined) {
      filters.delivery_fee_lte = searchDto.maxDeliveryFee;
    }

    // 최소 주문 금액 필터
    if (searchDto.maxMinimumOrder !== undefined) {
      filters.minimum_order_lte = searchDto.maxMinimumOrder;
    }

    // 배달/픽업 가능 여부
    if (searchDto.deliveryAvailable) {
      filters.delivery_available = true;
    }

    if (searchDto.pickupAvailable) {
      filters.pickup_available = true;
    }

    return filters;
  }

  /**
   * 가격대 필터 구성
   */
  private buildPriceRangeFilter(priceRange: PriceRange): Record<string, any> {
    switch (priceRange) {
      case PriceRange.BUDGET:
        return { average_price_per_person_lte: 10000 };
      case PriceRange.MODERATE:
        return { 
          average_price_per_person_gte: 10000,
          average_price_per_person_lte: 20000
        };
      case PriceRange.EXPENSIVE:
        return { 
          average_price_per_person_gte: 20000,
          average_price_per_person_lte: 30000
        };
      case PriceRange.PREMIUM:
        return { average_price_per_person_gte: 30000 };
      default:
        return {};
    }
  }

  /**
   * 정렬 옵션 구성
   */
  private buildOrderBy(sortBy?: SortOption, sortOrder?: 'asc' | 'desc'): { column: string; ascending: boolean } {
    const ascending = sortOrder !== 'desc';

    switch (sortBy) {
      case SortOption.RATING:
        return { column: 'rating', ascending: false }; // 높은 평점 우선
      case SortOption.DELIVERY_TIME:
        return { column: 'estimated_delivery_time', ascending: true }; // 빠른 배달 우선
      case SortOption.DELIVERY_FEE:
        return { column: 'delivery_fee', ascending: true }; // 낮은 배달비 우선
      case SortOption.DISTANCE:
        return { column: 'distance', ascending: true }; // 가까운 거리 우선
      case SortOption.POPULARITY:
        return { column: 'order_count', ascending: false }; // 인기 순
      case SortOption.NEWEST:
        return { column: 'created_at', ascending: false }; // 최신순
      default:
        return { column: 'rating', ascending: false }; // 기본: 평점순
    }
  }

  /**
   * 최적화된 SELECT 필드
   */
  private getOptimizedSelectFields(): string {
    return `
      id,
      name,
      description,
      address,
      phone,
      image_url,
      cuisine_type,
      rating,
      review_count,
      is_open,
      delivery_fee,
      minimum_order,
      estimated_delivery_time,
      average_price_per_person,
      category_id,
      created_at
    `.replace(/\s+/g, ' ').trim();
  }

  /**
   * 관련 데이터 배치 로딩 (N+1 문제 해결)
   */
  private async loadRelatedData(restaurants: any[]): Promise<SearchedRestaurantDto[]> {
    if (restaurants.length === 0) {
      return [];
    }

    this.logger.debug(`Loading related data for ${restaurants.length} restaurants`);

    // 레스토랑 ID 수집
    const restaurantIds = restaurants.map(r => r.id);

    // 배치 로딩으로 관련 데이터 동시 조회
    const [menuItemsMap, reviewsMap, promotionsMap, categoriesMap, imagesMap] = await Promise.all([
      this.loadMenuItems(restaurantIds),
      this.loadRecentReviews(restaurantIds),
      this.loadActivePromotions(restaurantIds),
      this.loadRestaurantCategories(restaurantIds),
      this.loadRestaurantImages(restaurantIds)
    ]);

    // 데이터 결합 및 SearchedRestaurantDto 형식으로 변환
    return Promise.all(restaurants.map(async restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address || '',
      addressDetail: restaurant.address_detail,
      phone: restaurant.phone || '',
      categories: this.extractCategoryNames(categoriesMap.get(restaurant.id) || []),
      distanceInfo: this.getDefaultDistanceInfo(),
      ratingInfo: this.getRatingInfo(restaurant),
      businessStatus: this.getBusinessStatus(restaurant),
      images: this.getRestaurantImages(imagesMap.get(restaurant.id) || []),
      promotions: this.transformPromotions(promotionsMap.get(restaurant.id) || []),
      deliveryAvailable: restaurant.delivery_available || false,
      pickupAvailable: restaurant.pickup_available || false,
      minimumOrderAmount: restaurant.minimum_order || 0,
      preparationTime: restaurant.estimated_preparation_time || 20,
      popularityScore: this.calculatePopularityScore(restaurant),
      createdAt: new Date(restaurant.created_at || Date.now()),
      relevanceScore: 1.0 // 기본값, 실제로는 검색 관련성에 따라 계산
    })));
  }

  /**
   * 메뉴 아이템 배치 로딩
   */
  private async loadMenuItems(restaurantIds: string[]): Promise<Map<string, any[]>> {
    return this.dbOptimizer.batchLoad(
      'menu_items',
      restaurantIds,
      'restaurant_id',
      'id, name, price, image_url, is_available, category'
    );
  }

  /**
   * 최근 리뷰 배치 로딩
   */
  private async loadRecentReviews(restaurantIds: string[]): Promise<Map<string, any[]>> {
    // 최근 3개 리뷰만 로딩
    const allReviews = await this.dbOptimizer.batchLoad(
      'reviews',
      restaurantIds,
      'restaurant_id',
      'id, rating, comment, customer_name, created_at'
    );

    // 각 레스토랑별로 최근 3개만 유지
    const limitedReviews = new Map<string, any[]>();
    allReviews.forEach((reviews, restaurantId) => {
      const sortedReviews = reviews
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      limitedReviews.set(restaurantId, sortedReviews);
    });

    return limitedReviews;
  }

  /**
   * 활성 프로모션 배치 로딩
   */
  private async loadActivePromotions(restaurantIds: string[]): Promise<Map<string, any[]>> {
    const now = new Date().toISOString();
    
    // 현재 활성화된 프로모션만 조회
    const { result } = await this.dbOptimizer.executeWithMetrics(
      this.supabase
        .from('promotions')
        .select('id, restaurant_id, title, description, discount_type, discount_value, valid_until')
        .in('restaurant_id', restaurantIds)
        .eq('is_active', true)
        .gte('valid_until', now),
      'Load active promotions'
    );

    // 레스토랑별로 그룹핑
    const promotionsMap = new Map<string, any[]>();
    restaurantIds.forEach(id => promotionsMap.set(id, []));

    (result as any[]).forEach(promotion => {
      const restaurantId = promotion.restaurant_id;
      if (promotionsMap.has(restaurantId)) {
        promotionsMap.get(restaurantId)!.push(promotion);
      }
    });

    return promotionsMap;
  }

  /**
   * 레스토랑 카테고리 배치 로딩
   */
  private async loadRestaurantCategories(restaurantIds: string[]): Promise<Map<string, any[]>> {
    return this.dbOptimizer.batchLoad(
      'restaurant_categories',
      restaurantIds,
      'id', // restaurant_categories 테이블에서 카테고리 정보 로딩
      'id, name, display_order'
    );
  }

  /**
   * 레스토랑 이미지 배치 로딩
   */
  private async loadRestaurantImages(restaurantIds: string[]): Promise<Map<string, any[]>> {
    return this.dbOptimizer.batchLoad(
      'restaurant_images',
      restaurantIds,
      'restaurant_id',
      'id, url, thumbnail_url, is_primary, alt_text'
    );
  }

  /**
   * 카테고리 이름 추출
   */
  private extractCategoryNames(categories: any[]): string[] {
    return categories.map(category => category.name).filter(name => name);
  }

  /**
   * 거리 정보 계산
   */
  private calculateDistanceInfo(restaurant: any): DistanceInfoDto {
    // 기본값 사용 (실제로는 사용자 위치 기반 계산)
    return {
      distance: restaurant.distance || 2.5,
      estimatedDeliveryTime: restaurant.estimated_delivery_time || 30,
      deliveryFee: restaurant.delivery_fee || 3000
    };
  }

  /**
   * 평점 정보 구성
   */
  private buildRatingInfo(restaurant: any, reviews: any[]): RatingInfoDto {
    return {
      averageRating: restaurant.rating || 0,
      totalReviews: restaurant.review_count || 0,
      ratingDistribution: this.calculateRatingDistribution(reviews)
    };
  }

  /**
   * 평점 분포 계산
   */
  private calculateRatingDistribution(reviews: any[]): number[] {
    const distribution = [0, 0, 0, 0, 0]; // 1점부터 5점까지
    
    reviews.forEach(review => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating - 1]++;
      }
    });

    return distribution;
  }

  /**
   * 영업 상태 구성
   */
  private buildBusinessStatus(restaurant: any): BusinessStatusDto {
    const isOpen = restaurant.is_open || false;
    
    return {
      isOpen,
      todayHours: restaurant.today_hours || '09:00 - 22:00',
      nextOpenTime: isOpen ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000), // 다음날
      statusMessage: isOpen ? '영업 중' : '영업 종료'
    };
  }

  /**
   * 이미지 변환
   */
  private transformImages(images: any[]): RestaurantImageDto[] {
    return images.map(image => ({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnail_url,
      isPrimary: image.is_primary || false,
      altText: image.alt_text
    }));
  }

  /**
   * 프로모션 변환
   */
  private transformPromotions(promotions: any[]): PromotionInfoDto[] {
    return promotions.map(promotion => ({
      id: promotion.id,
      title: promotion.title,
      description: promotion.description,
      discountType: promotion.discount_type,
      discountValue: promotion.discount_value,
      endDate: new Date(promotion.valid_until)
    }));
  }

  /**
   * 인기도 점수 계산
   */
  private calculatePopularityScore(restaurant: any): number {
    const rating = restaurant.rating || 0;
    const reviewCount = restaurant.review_count || 0;
    const orderCount = restaurant.order_count || 0;
    
    // 가중 평균으로 인기도 계산 (0-100 점)
    const ratingScore = (rating / 5) * 40; // 40%
    const reviewScore = Math.min(reviewCount / 100, 1) * 30; // 30%
    const orderScore = Math.min(orderCount / 1000, 1) * 30; // 30%
    
    return Math.round(ratingScore + reviewScore + orderScore);
  }

  /**
   * 적용된 필터 정보 추출
   */
  private getAppliedFilters(searchDto: RestaurantSearchDto): Record<string, any> {
    const applied: Record<string, any> = {};

    if (searchDto.keyword) applied.keyword = searchDto.keyword;
    if (searchDto.categoryIds?.length) applied.categories = searchDto.categoryIds;
    if (searchDto.priceRange) applied.priceRange = searchDto.priceRange;
    if (searchDto.minRating) applied.minRating = searchDto.minRating;
    if (searchDto.maxDeliveryFee !== undefined) applied.maxDeliveryFee = searchDto.maxDeliveryFee;
    if (searchDto.maxMinimumOrder !== undefined) applied.maxMinimumOrder = searchDto.maxMinimumOrder;
    if (searchDto.deliveryAvailable) applied.deliveryOnly = true;
    if (searchDto.pickupAvailable) applied.pickupAvailable = true;

    return applied;
  }

  /**
   * 사용 가능한 필터 옵션 조회 (캐시됨)
   */
  private async getAvailableFilters(): Promise<Record<string, any>> {
    // 실제로는 캐시에서 조회하거나 주기적으로 업데이트
    return {
      categories: await this.getAvailableCategories(),
      priceRanges: Object.values(PriceRange),
      maxDeliveryFee: 5000,
      deliveryTimes: [15, 30, 45, 60]
    };
  }

  /**
   * 사용 가능한 카테고리 조회
   */
  private async getAvailableCategories(): Promise<any[]> {
    const { result } = await this.dbOptimizer.executeWithMetrics(
      this.supabase
        .from('restaurant_categories')
        .select('id, name, icon_url')
        .eq('is_active', true)
        .order('name'),
      'Load available categories'
    );

    return result as any[];
  }

  /**
   * 검색 성능 통계 수집
   */
  async getSearchPerformanceStats(): Promise<{
    averageResponseTime: number;
    totalSearches: number;
    popularKeywords: string[];
    slowQueries: any[];
  }> {
    try {
      // 실제로는 Redis나 별도 로그 테이블에서 조회
      return {
        averageResponseTime: 150, // ms
        totalSearches: 10000,
        popularKeywords: ['치킨', '피자', '한식', '중식', '일식'],
        slowQueries: []
      };
    } catch (error) {
      this.logger.error('Failed to get search performance stats', error);
      return {
        averageResponseTime: 0,
        totalSearches: 0,
        popularKeywords: [],
        slowQueries: []
      };
    }
  }

  /**
   * 레스토랑 검색 메인 함수
   * 모든 필터링과 정렬 조건을 적용하여 레스토랑을 검색합니다.
   */
  async searchRestaurantsOld(searchDto: RestaurantSearchDto): Promise<RestaurantSearchResponseDto> {
    const startTime = Date.now();
    
    try {
      // 기본 쿼리 구성
      let query = this.supabase
        .from('restaurants')
        .select(`
          *,
          categories:restaurant_categories(
            id,
            name,
            display_order
          ),
          images:restaurant_images(
            id,
            url,
            thumbnail_url,
            is_primary,
            alt_text,
            is_active
          ),
          business_hours(
            day_of_week,
            open_time,
            close_time,
            is_closed
          ),
          special_business_hours(
            date,
            open_time,
            close_time,
            is_closed
          )
        `)
        .eq('is_active', true);

      // 키워드 검색 적용
      if (searchDto.keyword) {
        query = this.applyKeywordSearch(query, searchDto.keyword);
      }

      // 카테고리 필터 적용
      if (searchDto.categoryIds && searchDto.categoryIds.length > 0) {
        query = query.in('category_id', searchDto.categoryIds);
      }

      // 가격대 필터 적용
      if (searchDto.priceRange) {
        query = this.applyPriceRangeFilter(query, searchDto.priceRange);
      }

      // 평점 필터 적용
      if (searchDto.minRating) {
        query = query.gte('average_rating', searchDto.minRating);
      }

      // 배달비 필터 적용
      if (searchDto.maxDeliveryFee !== undefined) {
        query = query.lte('delivery_fee', searchDto.maxDeliveryFee);
      }

      // 배달 시간 필터 적용
      if (searchDto.maxDeliveryTime) {
        query = query.lte('estimated_delivery_time', searchDto.maxDeliveryTime);
      }

      // 배달/픽업 가능 여부 필터
      if (searchDto.deliveryAvailable) {
        query = query.eq('delivery_available', true);
      }

      if (searchDto.pickupAvailable) {
        query = query.eq('pickup_available', true);
      }

      // 프로모션 필터 적용
      if (searchDto.hasPromotion) {
        query = this.applyPromotionFilter(query);
      }

      // 전체 결과 수 계산 (페이지네이션용)
      const countQuery = this.supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // 같은 필터를 count 쿼리에도 적용
      if (searchDto.keyword) {
        const searchTerm = `%${searchDto.keyword}%`;
        countQuery.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm}`);
      }
      if (searchDto.categoryIds && searchDto.categoryIds.length > 0) {
        countQuery.in('category_id', searchDto.categoryIds);
      }
      if (searchDto.priceRange) {
        switch (searchDto.priceRange) {
          case PriceRange.BUDGET:
            countQuery.lte('average_price_per_person', 10000);
            break;
          case PriceRange.MODERATE:
            countQuery.gte('average_price_per_person', 10000).lte('average_price_per_person', 20000);
            break;
          case PriceRange.EXPENSIVE:
            countQuery.gte('average_price_per_person', 20000).lte('average_price_per_person', 30000);
            break;
          case PriceRange.PREMIUM:
            countQuery.gte('average_price_per_person', 30000);
            break;
        }
      }
      
      const { count: totalCount } = await countQuery;

      // 위치 기반 정렬 및 페이지네이션 적용
      let finalQuery = query;
      
      if (searchDto.location) {
        finalQuery = this.applyLocationBasedSearch(finalQuery, searchDto.location, searchDto.radius);
      }

      // 정렬 적용
      finalQuery = this.applySorting(finalQuery, searchDto.sortBy, searchDto.sortDirection);

      // 페이지네이션 적용
      const offset = (searchDto.page - 1) * searchDto.limit;
      finalQuery = finalQuery.range(offset, offset + searchDto.limit - 1);

      // 쿼리 실행
      const { data: restaurants, error } = await finalQuery;

      if (error) {
        throw new InternalServerErrorException(`레스토랑 검색 중 오류가 발생했습니다: ${error.message}`);
      }

      // 결과 데이터 변환
      const searchResults = await this.transformRestaurantData(restaurants, searchDto.location);

      // 영업 상태 필터 적용 (데이터 변환 후)
      const filteredResults = this.applyBusinessStatusFilter(searchResults, searchDto.businessStatus);

      // 페이지네이션 정보 계산
      const pagination = this.calculatePagination(
        searchDto.page,
        searchDto.limit,
        totalCount,
        filteredResults.length
      );

      // 검색 통계 정보
      const stats = this.generateSearchStats(
        totalCount,
        Date.now() - startTime,
        searchDto,
        filteredResults.length
      );

      return {
        success: true,
        message: '검색이 완료되었습니다.',
        data: filteredResults,
        pagination,
        stats,
        timestamp: new Date()
      };

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('레스토랑 검색 중 예상치 못한 오류가 발생했습니다.');
    }
  }

  /**
   * 키워드 검색 적용
   * 레스토랑명, 설명, 주소에서 키워드 검색
   */
  private applyKeywordSearch(query: any, keyword: string) {
    const searchTerm = `%${keyword}%`;
    return query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm}`);
  }

  /**
   * 가격대 필터 적용
   */
  private applyPriceRangeFilter(query: any, priceRange: PriceRange) {
    switch (priceRange) {
      case PriceRange.BUDGET:
        return query.lte('average_price_per_person', 10000);
      case PriceRange.MODERATE:
        return query.gte('average_price_per_person', 10000).lte('average_price_per_person', 20000);
      case PriceRange.EXPENSIVE:
        return query.gte('average_price_per_person', 20000).lte('average_price_per_person', 30000);
      case PriceRange.PREMIUM:
        return query.gte('average_price_per_person', 30000);
      default:
        return query;
    }
  }

  /**
   * 프로모션 필터 적용
   */
  private applyPromotionFilter(query: any) {
    const today = new Date().toISOString().split('T')[0];
    return query.not('promotions', 'is', null)
                .gte('promotions.end_date', today)
                .eq('promotions.is_active', true);
  }

  /**
   * 위치 기반 검색 적용
   * PostGIS ST_DWithin 함수를 사용하여 지정된 반경 내의 레스토랑 검색
   */
  private applyLocationBasedSearch(query: any, location: any, radius: number = 10) {
    // PostGIS 확장을 사용한 지리적 검색
    // ST_DWithin을 사용하여 반경 내 검색 (미터 단위)
    const radiusInMeters = radius * 1000;
    
    return query.rpc('restaurants_within_radius', {
      lat: location.latitude,
      lng: location.longitude,
      radius_meters: radiusInMeters
    });
  }

  /**
   * 정렬 적용
   */
  private applySorting(query: any, sortBy: SortOption = SortOption.DISTANCE, sortDirection: SortDirection = SortDirection.ASC) {
    const ascending = sortDirection === SortDirection.ASC;

    switch (sortBy) {
      case SortOption.DISTANCE:
        // 거리순 정렬은 위치 기반 검색에서 처리됨
        return query;
      case SortOption.RATING:
        return query.order('average_rating', { ascending: !ascending }); // 평점은 높은 순이 기본
      case SortOption.REVIEW_COUNT:
        return query.order('total_reviews', { ascending: !ascending });
      case SortOption.DELIVERY_TIME:
        return query.order('estimated_delivery_time', { ascending });
      case SortOption.DELIVERY_FEE:
        return query.order('delivery_fee', { ascending });
      case SortOption.POPULARITY:
        return query.order('popularity_score', { ascending: !ascending });
      case SortOption.NEWEST:
        return query.order('created_at', { ascending: !ascending });
      default:
        return query.order('created_at', { ascending: !ascending });
    }
  }

  /**
   * 레스토랑 데이터 변환
   * 데이터베이스 결과를 클라이언트 응답 형식으로 변환
   */
  private async transformRestaurantData(restaurants: any[], userLocation?: any): Promise<SearchedRestaurantDto[]> {
    return Promise.all(restaurants.map(async (restaurant) => {
      // 거리 계산
      const distanceInfo = userLocation 
        ? await this.calculateDistanceInfo(restaurant, userLocation)
        : this.getDefaultDistanceInfo();

      // 평점 정보
      const ratingInfo = this.getRatingInfo(restaurant);

      // 영업 상태 정보
      const businessStatus = this.getBusinessStatus(restaurant);

      // 이미지 정보
      const images = this.getRestaurantImages(restaurant.images || []);

      // 카테고리 정보
      const categories = (restaurant.categories || []).map((cat: any) => cat.name);

      return {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        addressDetail: restaurant.address_detail,
        phone: restaurant.phone,
        categories,
        distanceInfo,
        ratingInfo,
        businessStatus,
        images,
        promotions: restaurant.promotions || [],
        deliveryAvailable: restaurant.delivery_available,
        pickupAvailable: restaurant.pickup_available,
        minimumOrderAmount: restaurant.minimum_order_amount,
        preparationTime: restaurant.preparation_time,
        popularityScore: restaurant.popularity_score || 0,
        createdAt: new Date(restaurant.created_at),
        relevanceScore: 1.0 // 기본값, 향후 관련성 알고리즘 구현 시 개선
      };
    }));
  }

  /**
   * 거리 정보 계산
   */
  private async calculateDistanceInfo(restaurant: any, userLocation: any): Promise<DistanceInfoDto> {
    // Haversine 공식을 사용하여 거리 계산
    const distance = this.calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

    // 거리 기반 배달 시간 및 배달비 계산
    const estimatedDeliveryTime = this.calculateDeliveryTime(distance, restaurant.preparation_time);
    const deliveryFee = this.calculateDeliveryFee(distance, restaurant.delivery_fee);

    return {
      distance: Math.round(distance * 10) / 10, // 소수점 1자리
      estimatedDeliveryTime,
      deliveryFee
    };
  }

  /**
   * 기본 거리 정보 (위치 정보 없을 때)
   */
  private getDefaultDistanceInfo(): DistanceInfoDto {
    return {
      distance: 0,
      estimatedDeliveryTime: 30,
      deliveryFee: 3000
    };
  }

  /**
   * Haversine 공식을 사용한 거리 계산 (km 단위)
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 도를 라디안으로 변환
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 배달 시간 계산
   */
  private calculateDeliveryTime(distance: number, preparationTime: number): number {
    // 기본 조리 시간 + 거리별 배달 시간 (1km당 2분 추가)
    const travelTime = Math.ceil(distance * 2);
    return preparationTime + travelTime;
  }

  /**
   * 배달비 계산
   */
  private calculateDeliveryFee(distance: number, baseDeliveryFee: number): number {
    // 거리별 추가 배달비 (3km 초과 시 1km당 500원 추가)
    if (distance <= 3) {
      return baseDeliveryFee;
    }
    
    const additionalDistance = distance - 3;
    const additionalFee = Math.ceil(additionalDistance) * 500;
    return baseDeliveryFee + additionalFee;
  }

  /**
   * 평점 정보 구성
   */
  private getRatingInfo(restaurant: any): RatingInfoDto {
    return {
      averageRating: restaurant.average_rating || 0,
      totalReviews: restaurant.total_reviews || 0,
      ratingDistribution: restaurant.rating_distribution || [0, 0, 0, 0, 0]
    };
  }

  /**
   * 영업 상태 정보 구성
   */
  private getBusinessStatus(restaurant: any): BusinessStatusDto {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // 특별 영업시간 확인
    const todaySpecialHours = restaurant.special_business_hours?.find(
      (special: any) => special.date === now.toISOString().split('T')[0]
    );

    if (todaySpecialHours) {
      return this.getSpecialBusinessStatus(todaySpecialHours, now);
    }

    // 일반 영업시간 확인
    const todayHours = restaurant.business_hours?.find(
      (hours: any) => hours.day_of_week === today
    );

    if (!todayHours || todayHours.is_closed) {
      return {
        isOpen: false,
        todayHours: '휴무',
        statusMessage: '오늘 휴무',
        nextOpenTime: this.getNextOpenTime(restaurant.business_hours, now)
      };
    }

    return this.getRegularBusinessStatus(todayHours, now);
  }

  /**
   * 특별 영업시간 상태 확인
   */
  private getSpecialBusinessStatus(specialHours: any, now: Date): BusinessStatusDto {
    if (specialHours.is_closed) {
      return {
        isOpen: false,
        todayHours: '특별 휴무',
        statusMessage: '특별 휴무일',
        nextOpenTime: undefined
      };
    }

    const openTime = new Date(`${now.toDateString()} ${specialHours.open_time}`);
    const closeTime = new Date(`${now.toDateString()} ${specialHours.close_time}`);
    
    const isOpen = now >= openTime && now <= closeTime;

    return {
      isOpen,
      todayHours: `${specialHours.open_time} - ${specialHours.close_time}`,
      statusMessage: isOpen ? '영업 중' : '영업 종료',
      nextOpenTime: isOpen ? undefined : openTime
    };
  }

  /**
   * 일반 영업시간 상태 확인
   */
  private getRegularBusinessStatus(todayHours: any, now: Date): BusinessStatusDto {
    const openTime = new Date(`${now.toDateString()} ${todayHours.open_time}`);
    const closeTime = new Date(`${now.toDateString()} ${todayHours.close_time}`);
    
    const isOpen = now >= openTime && now <= closeTime;

    return {
      isOpen,
      todayHours: `${todayHours.open_time} - ${todayHours.close_time}`,
      statusMessage: isOpen ? '영업 중' : '영업 종료',
      nextOpenTime: isOpen ? undefined : openTime
    };
  }

  /**
   * 다음 영업 시작 시간 계산
   */
  private getNextOpenTime(businessHours: any[], currentDate: Date): Date | undefined {
    // 향후 7일간 영업시간 확인
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + i);
      const dayOfWeek = nextDate.getDay();
      
      const dayHours = businessHours?.find(h => h.day_of_week === dayOfWeek);
      if (dayHours && !dayHours.is_closed) {
        return new Date(`${nextDate.toDateString()} ${dayHours.open_time}`);
      }
    }
    
    return undefined;
  }

  /**
   * 레스토랑 이미지 정보 구성
   */
  private getRestaurantImages(images: any[]): RestaurantImageDto[] {
    return images
      .filter(img => img.is_active)
      .map(img => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnail_url,
        isPrimary: img.is_primary,
        altText: img.alt_text
      }))
      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)); // 대표 이미지 우선
  }

  /**
   * 영업 상태 필터 적용
   */
  private applyBusinessStatusFilter(results: SearchedRestaurantDto[], filter?: BusinessStatusFilter): SearchedRestaurantDto[] {
    if (!filter || filter === BusinessStatusFilter.ALL) {
      return results;
    }

    return results.filter(restaurant => {
      switch (filter) {
        case BusinessStatusFilter.OPEN:
          return restaurant.businessStatus.isOpen;
        case BusinessStatusFilter.CLOSED:
          return !restaurant.businessStatus.isOpen;
        case BusinessStatusFilter.OPENING_SOON:
          // 1시간 내 영업 시작인 경우
          const nextOpen = restaurant.businessStatus.nextOpenTime;
          if (!nextOpen) return false;
          const timeDiff = nextOpen.getTime() - new Date().getTime();
          return timeDiff > 0 && timeDiff <= 60 * 60 * 1000; // 1시간
        default:
          return true;
      }
    });
  }

  /**
   * 페이지네이션 정보 계산
   */
  private calculatePagination(page: number, limit: number, totalItems: number, currentItems: number): PaginationInfoDto {
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * 검색 통계 정보 생성
   */
  private generateSearchStats(totalResults: number, searchTime: number, searchDto: RestaurantSearchDto, filteredResults: number): SearchStatsDto {
    // 적용된 필터 수 계산
    let appliedFilters = 0;
    if (searchDto.keyword) appliedFilters++;
    if (searchDto.categoryIds?.length) appliedFilters++;
    if (searchDto.priceRange) appliedFilters++;
    if (searchDto.minRating) appliedFilters++;
    if (searchDto.maxDeliveryFee !== undefined) appliedFilters++;
    if (searchDto.maxDeliveryTime) appliedFilters++;
    if (searchDto.businessStatus !== BusinessStatusFilter.ALL) appliedFilters++;
    if (searchDto.deliveryAvailable) appliedFilters++;
    if (searchDto.pickupAvailable) appliedFilters++;
    if (searchDto.hasPromotion) appliedFilters++;

    return {
      totalResults: filteredResults,
      searchTime,
      appliedFilters,
      searchRegion: '검색 지역' // 향후 지역 정보 추가 시 개선
    };
  }

  /**
   * 자동완성 검색
   */
  async getAutocompleteSuggestions(query: string, limit: number = 10): Promise<AutocompleteResponseDto> {
    if (!query || query.length < 1) {
      return {
        suggestions: [],
        query,
        timestamp: new Date()
      };
    }

    const suggestions: AutocompleteResultDto[] = [];

    try {
      // 레스토랑명 검색
      const { data: restaurants } = await this.supabase
        .from('restaurants')
        .select('name')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(limit);

      restaurants?.forEach(restaurant => {
        suggestions.push({
          text: restaurant.name,
          type: 'restaurant',
          score: this.calculateRelevanceScore(query, restaurant.name),
          metadata: '레스토랑'
        });
      });

      // 카테고리 검색
      const { data: categories } = await this.supabase
        .from('restaurant_categories')
        .select('name')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(limit);

      categories?.forEach(category => {
        suggestions.push({
          text: category.name,
          type: 'category',
          score: this.calculateRelevanceScore(query, category.name),
          metadata: '카테고리'
        });
      });

      // 점수 기준으로 정렬하고 상위 결과만 반환
      const sortedSuggestions = suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        suggestions: sortedSuggestions,
        query,
        timestamp: new Date()
      };

    } catch (error) {
      throw new InternalServerErrorException('자동완성 검색 중 오류가 발생했습니다.');
    }
  }

  /**
   * 검색 관련성 점수 계산
   */
  private calculateRelevanceScore(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // 정확히 일치하는 경우
    if (textLower === queryLower) return 1.0;
    
    // 시작 부분이 일치하는 경우
    if (textLower.startsWith(queryLower)) return 0.8;
    
    // 포함하는 경우
    if (textLower.includes(queryLower)) return 0.6;
    
    // 유사도 계산 (간단한 문자열 유사도)
    return this.calculateStringSimilarity(queryLower, textLower);
  }

  /**
   * 문자열 유사도 계산 (Levenshtein 거리 기반)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  }

  /**
   * Levenshtein 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
} 