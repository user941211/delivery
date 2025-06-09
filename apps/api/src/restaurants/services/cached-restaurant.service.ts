/**
 * 캐싱이 적용된 레스토랑 서비스
 * 
 * CacheService를 활용하여 레스토랑 데이터 조회 성능을 최적화합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CacheKeyType } from '../../common/services/cache.service';
import { DatabaseOptimizer } from '../../common/utils/database-optimizer.util';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class CachedRestaurantService {
  private readonly logger = new Logger(CachedRestaurantService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly cacheService: CacheService,
    private readonly dbOptimizer: DatabaseOptimizer,
    private readonly configService: ConfigService
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 레스토랑 상세 정보 조회 (캐싱 적용)
   */
  async getRestaurantDetail(restaurantId: string): Promise<any> {
    const cacheKey = `detail_${restaurantId}`;
    
    // 캐시에서 먼저 확인
    const cached = await this.cacheService.get(
      CacheKeyType.RESTAURANT_DETAIL,
      cacheKey
    );
    
    if (cached) {
      this.logger.debug(`Cache hit for restaurant detail: ${restaurantId}`);
      return cached;
    }

    // 캐시 미스 시 DB에서 조회
    this.logger.debug(`Cache miss for restaurant detail: ${restaurantId}`);
    
    const { result } = await this.dbOptimizer.executeWithMetrics(
      this.supabase
        .from('restaurants')
        .select(`
          *,
          categories:restaurant_categories(id, name),
          images:restaurant_images(id, url, thumbnail_url, is_primary),
          business_hours(day_of_week, open_time, close_time, is_closed),
          menu_items(id, name, price, category, is_available)
        `)
        .eq('id', restaurantId)
        .eq('is_active', true)
        .single(),
      `Restaurant detail for ${restaurantId}`
    );

    // 결과를 캐시에 저장 (10분 TTL, 레스토랑 태그)
    if (result) {
      await this.cacheService.set(
        CacheKeyType.RESTAURANT_DETAIL,
        cacheKey,
        result,
        { 
          ttl: 600, 
          tags: [`restaurant_${restaurantId}`, 'restaurant_details'] 
        }
      );
    }

    return result;
  }

  /**
   * 레스토랑 메뉴 조회 (캐싱 적용)
   */
  async getRestaurantMenu(restaurantId: string, categoryId?: string): Promise<any[]> {
    const cacheKey = `menu_${restaurantId}_${categoryId || 'all'}`;
    
    // 캐시에서 먼저 확인
    const cached = await this.cacheService.get(
      CacheKeyType.MENU_ITEMS,
      cacheKey
    );
    
    if (cached) {
      this.logger.debug(`Cache hit for menu: ${restaurantId}`);
      return cached;
    }

    // 캐시 미스 시 DB에서 조회
    let query = this.supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        price,
        category,
        image_url,
        is_available,
        preparation_time,
        allergens,
        ingredients
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category')
      .order('display_order');

    if (categoryId) {
      query = query.eq('category', categoryId);
    }

    const { result } = await this.dbOptimizer.executeWithMetrics(
      query,
      `Menu items for restaurant ${restaurantId}`
    );

    // 결과를 캐시에 저장 (15분 TTL, 메뉴 태그)
    if (result) {
      await this.cacheService.set(
        CacheKeyType.MENU_ITEMS,
        cacheKey,
        result,
        { 
          ttl: 900, 
          tags: [`restaurant_${restaurantId}`, 'menu_items', `menu_category_${categoryId || 'all'}`] 
        }
      );
    }

    return result || [];
  }

  /**
   * 레스토랑 리뷰 통계 조회 (캐싱 적용)
   */
  async getRestaurantReviewStats(restaurantId: string): Promise<any> {
    const cacheKey = `review_stats_${restaurantId}`;
    
    // 캐시에서 먼저 확인
    const cached = await this.cacheService.get(
      CacheKeyType.REVIEW_STATS,
      cacheKey
    );
    
    if (cached) {
      this.logger.debug(`Cache hit for review stats: ${restaurantId}`);
      return cached;
    }

    // 캐시 미스 시 DB에서 집계
    const { result: reviews } = await this.dbOptimizer.executeWithMetrics(
      this.supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),
      `Review stats for restaurant ${restaurantId}`
    );

    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [0, 0, 0, 0, 0],
        recentReviewsCount: 0
      };
    }

    // 통계 계산
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = [0, 0, 0, 0, 0];
    reviews.forEach((review: any) => {
      const ratingIndex = Math.floor(review.rating) - 1;
      if (ratingIndex >= 0 && ratingIndex < 5) {
        ratingDistribution[ratingIndex]++;
      }
    });

    // 최근 30일 리뷰 수
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReviewsCount = reviews.filter((review: any) => 
      new Date(review.created_at) >= thirtyDaysAgo
    ).length;

    const stats = {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      recentReviewsCount
    };

    // 결과를 캐시에 저장 (30분 TTL, 리뷰 태그)
    await this.cacheService.set(
      CacheKeyType.REVIEW_STATS,
      cacheKey,
      stats,
      { 
        ttl: 1800, 
        tags: [`restaurant_${restaurantId}`, 'review_stats'] 
      }
    );

    return stats;
  }

  /**
   * 레스토랑 영업시간 조회 (캐싱 적용)
   */
  async getRestaurantBusinessHours(restaurantId: string): Promise<any> {
    const cacheKey = `business_hours_${restaurantId}`;
    
    // 캐시에서 먼저 확인
    const cached = await this.cacheService.get(
      CacheKeyType.BUSINESS_HOURS,
      cacheKey
    );
    
    if (cached) {
      this.logger.debug(`Cache hit for business hours: ${restaurantId}`);
      return cached;
    }

    // 캐시 미스 시 DB에서 조회
    const [regularHours, specialHours] = await Promise.all([
      this.dbOptimizer.executeWithMetrics(
        this.supabase
          .from('business_hours')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('day_of_week'),
        `Regular business hours for ${restaurantId}`
      ),
      this.dbOptimizer.executeWithMetrics(
        this.supabase
          .from('special_business_hours')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date'),
        `Special business hours for ${restaurantId}`
      )
    ]);

    const businessHours = {
      regular: regularHours.result || [],
      special: specialHours.result || [],
      currentStatus: this.calculateCurrentBusinessStatus(regularHours.result, specialHours.result)
    };

    // 결과를 캐시에 저장 (1시간 TTL, 영업시간 태그)
    await this.cacheService.set(
      CacheKeyType.BUSINESS_HOURS,
      cacheKey,
      businessHours,
      { 
        ttl: 3600, 
        tags: [`restaurant_${restaurantId}`, 'business_hours'] 
      }
    );

    return businessHours;
  }

  /**
   * 레스토랑 데이터 무효화 (업데이트 시 호출)
   */
  async invalidateRestaurantCache(restaurantId: string): Promise<void> {
    this.logger.log(`Invalidating cache for restaurant: ${restaurantId}`);
    
    // 레스토랑 관련 모든 캐시 무효화
    await this.cacheService.invalidateByTags([`restaurant_${restaurantId}`]);
  }

  /**
   * 메뉴 데이터 무효화 (메뉴 업데이트 시 호출)
   */
  async invalidateMenuCache(restaurantId: string, categoryId?: string): Promise<void> {
    this.logger.log(`Invalidating menu cache for restaurant: ${restaurantId}`);
    
    const tags = [`restaurant_${restaurantId}`, 'menu_items'];
    if (categoryId) {
      tags.push(`menu_category_${categoryId}`);
    }
    
    await this.cacheService.invalidateByTags(tags);
  }

  /**
   * 리뷰 통계 무효화 (새 리뷰 추가 시 호출)
   */
  async invalidateReviewStatsCache(restaurantId: string): Promise<void> {
    this.logger.log(`Invalidating review stats cache for restaurant: ${restaurantId}`);
    
    await this.cacheService.invalidateByTags([`restaurant_${restaurantId}`, 'review_stats']);
  }

  /**
   * 캐시 워밍업 (자주 조회되는 레스토랑 데이터 미리 로딩)
   */
  async warmupPopularRestaurants(): Promise<void> {
    this.logger.log('Starting cache warmup for popular restaurants');
    
    try {
      // 인기 레스토랑 ID 목록 조회
      const { result: popularRestaurants } = await this.dbOptimizer.executeWithMetrics(
        this.supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .order('order_count', { ascending: false })
          .limit(20),
        'Popular restaurants for warmup'
      );

      if (popularRestaurants && popularRestaurants.length > 0) {
        // 병렬로 인기 레스토랑 데이터 로딩
        await Promise.all(
          popularRestaurants.map(async (restaurant: any) => {
            try {
              await this.getRestaurantDetail(restaurant.id);
              await this.getRestaurantMenu(restaurant.id);
              await this.getRestaurantReviewStats(restaurant.id);
              await this.getRestaurantBusinessHours(restaurant.id);
            } catch (error) {
              this.logger.warn(`Failed to warmup restaurant ${restaurant.id}`, error);
            }
          })
        );
      }

      this.logger.log('Cache warmup completed for popular restaurants');
    } catch (error) {
      this.logger.error('Cache warmup failed', error);
    }
  }

  /**
   * 현재 영업 상태 계산
   */
  private calculateCurrentBusinessStatus(regularHours: any[], specialHours: any[]): any {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM 형식
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    // 특별 영업시간 확인 (우선순위 높음)
    const todaySpecial = specialHours.find(sh => sh.date === currentDate);
    if (todaySpecial) {
      if (todaySpecial.is_closed) {
        return {
          isOpen: false,
          status: 'closed',
          message: '특별 휴무일입니다',
          nextOpenTime: null
        };
      }
      
      const isOpen = currentTime >= todaySpecial.open_time && currentTime <= todaySpecial.close_time;
      return {
        isOpen,
        status: isOpen ? 'open' : 'closed',
        message: isOpen ? '영업 중 (특별 영업시간)' : '영업 종료',
        closeTime: todaySpecial.close_time,
        nextOpenTime: isOpen ? null : todaySpecial.open_time
      };
    }

    // 일반 영업시간 확인
    const todayHours = regularHours.find(rh => rh.day_of_week === today);
    if (!todayHours || todayHours.is_closed) {
      return {
        isOpen: false,
        status: 'closed',
        message: '정기 휴무일입니다',
        nextOpenTime: this.getNextOpenTime(regularHours, now)
      };
    }

    const isOpen = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
    return {
      isOpen,
      status: isOpen ? 'open' : 'closed',
      message: isOpen ? '영업 중' : '영업 종료',
      closeTime: todayHours.close_time,
      nextOpenTime: isOpen ? null : todayHours.open_time
    };
  }

  /**
   * 다음 영업 시작 시간 계산
   */
  private getNextOpenTime(regularHours: any[], currentDate: Date): string | null {
    // 다음 7일 동안 영업 시작 시간 찾기
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + i);
      const nextDay = nextDate.getDay();
      
      const nextDayHours = regularHours.find(rh => rh.day_of_week === nextDay);
      if (nextDayHours && !nextDayHours.is_closed) {
        return nextDayHours.open_time;
      }
    }
    
    return null;
  }
} 