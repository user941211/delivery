/**
 * 캐싱 서비스
 * 
 * Redis 기반 분산 캐싱과 메모리 캐싱을 제공하며,
 * 다양한 캐싱 전략과 무효화 전략을 구현합니다.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 캐시 키 타입 정의
 */
export enum CacheKeyType {
  RESTAURANT_SEARCH = 'restaurant:search',
  RESTAURANT_DETAIL = 'restaurant:detail',
  MENU_ITEMS = 'menu:items',
  USER_SESSION = 'user:session',
  ORDER_STATUS = 'order:status',
  PAYMENT_STATUS = 'payment:status',
  DELIVERY_TRACKING = 'delivery:tracking',
  CATEGORY_LIST = 'category:list',
  PROMOTION_LIST = 'promotion:list',
  REVIEW_STATS = 'review:stats',
  BUSINESS_HOURS = 'business:hours',
  DISTANCE_MATRIX = 'distance:matrix'
}

/**
 * 캐시 옵션 인터페이스
 */
export interface CacheOptions {
  ttl?: number; // Time To Live (초)
  tags?: string[]; // 캐시 태그 (무효화용)
  compress?: boolean; // 압축 여부
  namespace?: string; // 네임스페이스
  keyGenerator?: (...args: any[]) => string; // 커스텀 키 생성기
}

/**
 * 캐시 통계 인터페이스
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  operationsPerSecond: number;
}

/**
 * 캐시 무효화 패턴
 */
export enum InvalidationPattern {
  EXACT = 'exact',      // 정확한 키 매칭
  PREFIX = 'prefix',    // 접두사 매칭
  PATTERN = 'pattern',  // 와일드카드 패턴
  TAGS = 'tags'         // 태그 기반
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly localCache = new Map<string, { value: any; expiry: number; tags?: string[] }>();
  private readonly cacheStats = {
    hits: 0,
    misses: 0,
    operations: 0,
    startTime: Date.now()
  };

  // 기본 TTL 설정 (초)
  private readonly DEFAULT_TTL = {
    [CacheKeyType.RESTAURANT_SEARCH]: 300,     // 5분
    [CacheKeyType.RESTAURANT_DETAIL]: 600,     // 10분
    [CacheKeyType.MENU_ITEMS]: 900,            // 15분
    [CacheKeyType.USER_SESSION]: 3600,         // 1시간
    [CacheKeyType.ORDER_STATUS]: 30,           // 30초
    [CacheKeyType.PAYMENT_STATUS]: 60,         // 1분
    [CacheKeyType.DELIVERY_TRACKING]: 15,      // 15초
    [CacheKeyType.CATEGORY_LIST]: 3600,        // 1시간
    [CacheKeyType.PROMOTION_LIST]: 300,        // 5분
    [CacheKeyType.REVIEW_STATS]: 1800,         // 30분
    [CacheKeyType.BUSINESS_HOURS]: 3600,       // 1시간
    [CacheKeyType.DISTANCE_MATRIX]: 1800       // 30분
  };

  constructor(private readonly configService: ConfigService) {
    // 로컬 캐시 정리 작업 (5분마다)
    setInterval(() => this.cleanupLocalCache(), 5 * 60 * 1000);
    this.logger.log('CacheService initialized with local cache fallback');
  }

  async onModuleDestroy() {
    this.localCache.clear();
    this.logger.log('CacheService destroyed');
  }

  /**
   * 캐시에서 값 조회
   */
  async get<T>(
    keyType: CacheKeyType,
    key: string,
    options: { useLocal?: boolean; decompress?: boolean } = {}
  ): Promise<T | null> {
    const fullKey = this.buildKey(keyType, key, options);
    
    try {
      // 로컬 캐시에서 확인
      const localValue = this.getFromLocalCache<T>(fullKey);
      if (localValue !== null) {
        this.cacheStats.hits++;
        return localValue;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${fullKey}`, error);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * 캐시에 값 저장
   */
  async set<T>(
    keyType: CacheKeyType,
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const fullKey = this.buildKey(keyType, key, options);
    const ttl = options.ttl || this.DEFAULT_TTL[keyType] || 300;

    try {
      // 로컬 캐시에 저장
      this.setInLocalCache(fullKey, value, ttl, options.tags);
      this.cacheStats.operations++;
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${fullKey}`, error);
      return false;
    }
  }

  /**
   * 캐시에서 값 삭제
   */
  async delete(
    keyType: CacheKeyType,
    key: string,
    options: { namespace?: string } = {}
  ): Promise<boolean> {
    const fullKey = this.buildKey(keyType, key, options);

    try {
      this.localCache.delete(fullKey);
      this.cacheStats.operations++;
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${fullKey}`, error);
      return false;
    }
  }

  /**
   * 캐시 무효화 (패턴 기반)
   */
  async invalidate(
    pattern: string,
    type: InvalidationPattern = InvalidationPattern.PREFIX
  ): Promise<number> {
    try {
      let keys: string[] = [];

      switch (type) {
        case InvalidationPattern.EXACT:
          keys = [pattern];
          break;

        case InvalidationPattern.PREFIX:
          keys = Array.from(this.localCache.keys()).filter(key => key.startsWith(pattern));
          break;

        case InvalidationPattern.PATTERN:
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          keys = Array.from(this.localCache.keys()).filter(key => regex.test(key));
          break;

        case InvalidationPattern.TAGS:
          keys = Array.from(this.localCache.entries())
            .filter(([_, cached]) => cached.tags && cached.tags.includes(pattern))
            .map(([key, _]) => key);
          break;
      }

      // 로컬 캐시에서 삭제
      keys.forEach(key => this.localCache.delete(key));

      if (keys.length > 0) {
        this.logger.debug(`Invalidated ${keys.length} cache keys with pattern: ${pattern}`);
      }

      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}`, error);
      return 0;
    }
  }

  /**
   * 태그 기반 캐시 무효화
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      const invalidated = await this.invalidate(tag, InvalidationPattern.TAGS);
      totalInvalidated += invalidated;
    }

    return totalInvalidated;
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<CacheStats> {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;
    const runtime = (Date.now() - this.cacheStats.startTime) / 1000;
    const operationsPerSecond = runtime > 0 ? this.cacheStats.operations / runtime : 0;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys: this.localCache.size,
      memoryUsage: 0, // 로컬 캐시의 경우 정확한 메모리 사용량 계산 복잡
      operationsPerSecond: Math.round(operationsPerSecond * 100) / 100
    };
  }

  /**
   * 캐시 워밍업 (주요 데이터 미리 로딩)
   */
  async warmup(keyType: CacheKeyType, dataLoader: () => Promise<any>): Promise<void> {
    this.logger.log(`Starting cache warmup for ${keyType}`);

    try {
      const data = await dataLoader();
      await this.set(keyType, 'warmup', data, { ttl: this.DEFAULT_TTL[keyType] });
      this.logger.log(`Cache warmup completed for ${keyType}`);
    } catch (error) {
      this.logger.error(`Cache warmup failed for ${keyType}`, error);
    }
  }

  /**
   * 캐시 키 생성
   */
  private buildKey(
    keyType: CacheKeyType,
    key: string,
    options: { namespace?: string } = {}
  ): string {
    const namespace = options.namespace || 'default';
    return `${namespace}:${keyType}:${key}`;
  }

  /**
   * 로컬 캐시에서 값 조회
   */
  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.localCache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * 로컬 캐시에 값 저장
   */
  private setInLocalCache<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    tags?: string[]
  ): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.localCache.set(key, { value, expiry, tags });
  }

  /**
   * 로컬 캐시 정리
   */
  private cleanupLocalCache(): void {
    const now = Date.now();
    let cleanedUp = 0;

    for (const [key, cached] of this.localCache.entries()) {
      if (now > cached.expiry) {
        this.localCache.delete(key);
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      this.logger.debug(`Cleaned up ${cleanedUp} expired local cache entries`);
    }
  }
}

/**
 * 캐시 데코레이터 팩토리
 */
export function Cacheable(
  keyType: CacheKeyType,
  options: CacheOptions = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;
      
      if (!cacheService) {
        return method.apply(this, args);
      }

      // 캐시 키 생성
      const keyGenerator = options.keyGenerator || ((...args) => 
        JSON.stringify(args).replace(/[^a-zA-Z0-9]/g, '_')
      );
      const cacheKey = keyGenerator(...args);

      // 캐시에서 조회
      const cachedResult = await cacheService.get(keyType, cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 캐시 미스 시 원본 메서드 실행
      const result = await method.apply(this, args);
      
      // 결과를 캐시에 저장
      await cacheService.set(keyType, cacheKey, result, options);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * 캐시 무효화 데코레이터
 */
export function CacheEvict(
  keyType: CacheKeyType,
  options: { pattern?: string; tags?: string[] } = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      const cacheService: CacheService = this.cacheService;
      if (cacheService) {
        if (options.tags && options.tags.length > 0) {
          await cacheService.invalidateByTags(options.tags);
        } else if (options.pattern) {
          await cacheService.invalidate(options.pattern, InvalidationPattern.PREFIX);
        }
      }

      return result;
    };

    return descriptor;
  };
} 