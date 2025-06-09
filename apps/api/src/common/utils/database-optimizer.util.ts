/**
 * 데이터베이스 쿼리 최적화 유틸리티
 * 
 * N+1 문제 해결, 쿼리 성능 개선, 페이지네이션 최적화를 위한 헬퍼 함수들을 제공합니다.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@nestjs/common';

/**
 * 페이지네이션 결과 인터페이스
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 쿼리 성능 측정 결과 인터페이스
 */
export interface QueryPerformanceMetrics {
  queryTime: number;
  rowCount: number;
  query: string;
  params?: any;
}

/**
 * 배치 쿼리 옵션 인터페이스
 */
export interface BatchQueryOptions {
  batchSize: number;
  concurrent: boolean;
  delayMs?: number;
}

/**
 * 데이터베이스 최적화 유틸리티 클래스
 */
export class DatabaseOptimizer {
  private readonly logger = new Logger(DatabaseOptimizer.name);

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 성능 측정이 포함된 쿼리 실행
   */
  async executeWithMetrics<T>(
    queryBuilder: any,
    queryDescription: string
  ): Promise<{ result: T; metrics: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Executing query: ${queryDescription}`);
      
      const { data, error, count } = await queryBuilder;
      
      if (error) {
        throw error;
      }

      const queryTime = Date.now() - startTime;
      const metrics: QueryPerformanceMetrics = {
        queryTime,
        rowCount: data?.length || count || 0,
        query: queryDescription
      };

      this.logger.debug(`Query completed in ${queryTime}ms, rows: ${metrics.rowCount}`);

      if (queryTime > 1000) {
        this.logger.warn(`Slow query detected: ${queryDescription} took ${queryTime}ms`);
      }

      return {
        result: data as T,
        metrics
      };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.logger.error(`Query failed after ${queryTime}ms: ${queryDescription}`, error);
      throw error;
    }
  }

  /**
   * 최적화된 페이지네이션 쿼리
   */
  async paginateQuery<T>(
    tableName: string,
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean },
    selectFields?: string
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * limit;
    
    // 메인 데이터 쿼리
    let dataQuery = this.supabase
      .from(tableName)
      .select(selectFields || '*')
      .range(offset, offset + limit - 1);

    // 카운트 쿼리 (최적화: 별도 실행)
    let countQuery = this.supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // 필터 적용
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            dataQuery = dataQuery.in(key, value);
            countQuery = countQuery.in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            dataQuery = dataQuery.ilike(key, value);
            countQuery = countQuery.ilike(key, value);
          } else {
            dataQuery = dataQuery.eq(key, value);
            countQuery = countQuery.eq(key, value);
          }
        }
      });
    }

    // 정렬 적용
    if (orderBy) {
      dataQuery = dataQuery.order(orderBy.column, { ascending: orderBy.ascending !== false });
    }

    // 병렬 실행으로 성능 최적화
    const [dataResult, countResult] = await Promise.all([
      this.executeWithMetrics(dataQuery, `${tableName} paginated data`),
      this.executeWithMetrics(countQuery, `${tableName} count`)
    ]);

    const totalCount = typeof countResult.result === 'number' ? countResult.result : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: dataResult.result as T[],
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * N+1 문제 해결을 위한 배치 로딩
   */
  async batchLoad<T, K>(
    tableName: string,
    ids: K[],
    foreignKey: string,
    selectFields?: string
  ): Promise<Map<K, T[]>> {
    if (ids.length === 0) {
      return new Map();
    }

    // 중복 제거
    const uniqueIds = [...new Set(ids)];

    this.logger.debug(`Batch loading ${uniqueIds.length} records from ${tableName}`);

    const { result } = await this.executeWithMetrics(
      this.supabase
        .from(tableName)
        .select(selectFields || '*')
        .in(foreignKey, uniqueIds),
      `Batch load ${tableName} by ${foreignKey}`
    );

    // ID별로 그룹핑
    const groupedResults = new Map<K, T[]>();
    
    // 초기화
    uniqueIds.forEach(id => {
      groupedResults.set(id, []);
    });

    // 결과 그룹핑
    (result as any[]).forEach(item => {
      const key = item[foreignKey] as K;
      if (groupedResults.has(key)) {
        groupedResults.get(key)!.push(item as T);
      }
    });

    return groupedResults;
  }

  /**
   * 대용량 데이터 배치 처리
   */
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options: BatchQueryOptions = { batchSize: 100, concurrent: false }
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];

    // 배치로 나누기
    for (let i = 0; i < items.length; i += options.batchSize) {
      batches.push(items.slice(i, i + options.batchSize));
    }

    this.logger.debug(`Processing ${items.length} items in ${batches.length} batches`);

    if (options.concurrent) {
      // 병렬 처리
      const batchPromises = batches.map(async (batch, index) => {
        if (options.delayMs && index > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs! * index));
        }
        return processor(batch);
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(batchResult => {
        results.push(...batchResult);
      });
    } else {
      // 순차 처리
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        if (options.delayMs && i > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs!));
        }

        const batchResult = await processor(batch);
        results.push(...batchResult);

        this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
      }
    }

    return results;
  }

  /**
   * 관계형 데이터 최적화 로딩 (JOIN 대신 사용)
   */
  async loadRelatedData<T, R>(
    mainData: T[],
    getRelatedIds: (item: T) => string | string[],
    relatedTableName: string,
    relatedKey: string,
    selectFields?: string
  ): Promise<{ main: T; related: R[] }[]> {
    // 모든 관련 ID 수집
    const allRelatedIds: string[] = [];
    mainData.forEach(item => {
      const ids = getRelatedIds(item);
      if (Array.isArray(ids)) {
        allRelatedIds.push(...ids);
      } else if (ids) {
        allRelatedIds.push(ids);
      }
    });

    // 배치 로딩으로 관련 데이터 가져오기
    const relatedDataMap = await this.batchLoad<R, string>(
      relatedTableName,
      allRelatedIds,
      relatedKey,
      selectFields
    );

    // 메인 데이터와 관련 데이터 매핑
    return mainData.map(mainItem => {
      const relatedIds = getRelatedIds(mainItem);
      let related: R[] = [];

      if (Array.isArray(relatedIds)) {
        relatedIds.forEach(id => {
          related.push(...(relatedDataMap.get(id) || []));
        });
      } else if (relatedIds) {
        related = relatedDataMap.get(relatedIds) || [];
      }

      return {
        main: mainItem,
        related
      };
    });
  }

  /**
   * 캐시 친화적 쿼리 빌더
   */
  buildCacheableQuery(
    tableName: string,
    filters: Record<string, any>,
    selectFields?: string,
    orderBy?: { column: string; ascending?: boolean }
  ) {
    let query = this.supabase
      .from(tableName)
      .select(selectFields || '*');

    // 필터를 정렬된 순서로 적용 (캐시 키 일관성)
    const sortedFilters = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b));

    sortedFilters.forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value.sort());
      } else if (typeof value === 'string' && value.includes('%')) {
        query = query.ilike(key, value);
      } else {
        query = query.eq(key, value);
      }
    });

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
    }

    return query;
  }

  /**
   * 효율적인 카운트 쿼리
   * (정확한 카운트가 필요하지 않은 경우 성능 최적화)
   */
  async getApproximateCount(
    tableName: string,
    filters?: Record<string, any>,
    useExactCount: boolean = false
  ): Promise<number> {
    if (useExactCount) {
      const query = this.buildCacheableQuery(tableName, filters || {});
      const { count } = await query.select('*', { count: 'exact', head: true });
      return count || 0;
    }

    // Supabase에서는 근사치 카운트 함수를 직접 제공하지 않으므로
    // 정확한 카운트로 폴백
    this.logger.warn('Approximate count not available in Supabase, using exact count');
    return this.getApproximateCount(tableName, filters, true);
  }

  /**
   * 쿼리 실행 계획 분석 (개발/디버깅용)
   */
  async analyzeQuery(query: string): Promise<any> {
    try {
      // 실제로는 Supabase에서 직접 EXPLAIN 쿼리를 실행할 수 없으므로
      // 이 기능은 개발 환경에서만 사용하거나 별도의 관리 도구를 통해 실행해야 합니다.
      this.logger.warn('Query analysis is not available in Supabase client. Use Supabase Dashboard or direct PostgreSQL connection.');
      return null;
    } catch (error) {
      this.logger.error('Query analysis failed', error);
      return null;
    }
  }

  /**
   * 성능 통계 수집
   */
  async getPerformanceStats(tableName: string): Promise<{
    tableSize: string;
    indexUsage: any[];
    slowQueries: any[];
  }> {
    try {
      // 실제로는 pg_stat_user_tables, pg_statio_user_tables 등을 조회해야 하지만
      // Supabase에서는 제한적이므로 기본값 반환
      this.logger.warn('Performance stats collection requires database admin privileges. Use Supabase Dashboard for detailed statistics.');
      
      return {
        tableSize: 'Unknown - Check Supabase Dashboard',
        indexUsage: [],
        slowQueries: []
      };
    } catch (error) {
      this.logger.error('Failed to get performance stats', error);
      return {
        tableSize: 'Unknown',
        indexUsage: [],
        slowQueries: []
      };
    }
  }

  /**
   * 커넥션 풀 상태 모니터링
   */
  async getConnectionStats(): Promise<{
    active: number;
    idle: number;
    waiting: number;
    maxConnections: number;
  }> {
    try {
      // Supabase에서는 클라이언트 레벨에서 커넥션 통계를 직접 조회할 수 없음
      this.logger.warn('Connection stats require database admin access. Monitor through Supabase Dashboard.');
      
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        maxConnections: 100
      };
    } catch (error) {
      this.logger.error('Failed to get connection stats', error);
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        maxConnections: 100
      };
    }
  }
}

/**
 * 글로벌 데이터베이스 최적화 유틸리티 인스턴스 생성 함수
 */
export const createDatabaseOptimizer = (supabase: SupabaseClient): DatabaseOptimizer => {
  return new DatabaseOptimizer(supabase);
};

/**
 * 페이지네이션 헬퍼 함수
 */
export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    offset,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    startIndex: offset + 1,
    endIndex: Math.min(offset + limit, total)
  };
};

/**
 * 쿼리 캐시 키 생성 헬퍼
 */
export const generateCacheKey = (
  operation: string,
  tableName: string,
  filters: Record<string, any>,
  additionalParams?: Record<string, any>
): string => {
  const sortedFilters = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.sort().join(',') : value}`)
    .join('|');

  const additional = additionalParams 
    ? Object.entries(additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|')
    : '';

  return `${operation}:${tableName}:${sortedFilters}${additional ? ':' + additional : ''}`;
}; 