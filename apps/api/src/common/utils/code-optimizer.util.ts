/**
 * 코드 성능 최적화 유틸리티
 * 
 * 알고리즘 복잡도 개선, 메모리 사용량 최적화, 
 * 중복 코드 제거 등을 통해 코드 성능을 향상시킵니다.
 */

import { Logger } from '@nestjs/common';

/**
 * 성능 메트릭 인터페이스
 */
export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  operationsCount: number;
  complexity: 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(2^n)';
}

/**
 * 최적화 권장사항
 */
export interface OptimizationSuggestion {
  type: 'algorithm' | 'memory' | 'duplication' | 'complexity' | 'structure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  estimatedImpact: number; // 퍼센트
}

/**
 * 데이터 구조 최적화기
 */
export class DataStructureOptimizer {
  private static readonly logger = new Logger(DataStructureOptimizer.name);

  /**
   * 배열 검색 최적화 (선형 -> 해시맵)
   */
  static optimizeArrayLookup<T>(
    items: T[], 
    keyExtractor: (item: T) => string | number,
    searchKeys: (string | number)[]
  ): Map<string | number, T> {
    // O(n) 선형 검색을 O(1) 해시맵 검색으로 최적화
    const itemMap = new Map<string | number, T>();
    
    // 한 번의 순회로 맵 생성 (O(n))
    for (const item of items) {
      const key = keyExtractor(item);
      itemMap.set(key, item);
    }

    this.logger.debug(`Optimized array lookup: ${items.length} items -> O(1) hash map`);
    return itemMap;
  }

  /**
   * 중복 제거 최적화
   */
  static removeDuplicates<T>(
    items: T[],
    keyExtractor?: (item: T) => string | number
  ): T[] {
    if (!keyExtractor) {
      // 원시 타입 중복 제거 (Set 사용)
      return Array.from(new Set(items));
    }

    // 객체 중복 제거 (Map 사용)
    const seen = new Map<string | number, T>();
    const result: T[] = [];

    for (const item of items) {
      const key = keyExtractor(item);
      if (!seen.has(key)) {
        seen.set(key, item);
        result.push(item);
      }
    }

    const duplicatesRemoved = items.length - result.length;
    this.logger.debug(`Removed ${duplicatesRemoved} duplicates from ${items.length} items`);
    
    return result;
  }

  /**
   * 정렬 최적화 (적절한 알고리즘 선택)
   */
  static optimizedSort<T>(
    items: T[],
    compareFn?: (a: T, b: T) => number
  ): T[] {
    if (items.length <= 1) return [...items];

    // 작은 배열: 삽입 정렬 (O(n²) 하지만 작은 n에서 빠름)
    if (items.length <= 10) {
      return this.insertionSort([...items], compareFn);
    }

    // 큰 배열: 네이티브 정렬 사용 (보통 Timsort, O(n log n))
    const result = [...items];
    if (compareFn) {
      result.sort(compareFn);
    } else {
      result.sort();
    }

    this.logger.debug(`Optimized sort: ${items.length} items`);
    return result;
  }

  /**
   * 삽입 정렬 (작은 배열 최적화용)
   */
  private static insertionSort<T>(
    items: T[],
    compareFn?: (a: T, b: T) => number
  ): T[] {
    for (let i = 1; i < items.length; i++) {
      const current = items[i];
      let j = i - 1;

      while (j >= 0) {
        const shouldSwap = compareFn 
          ? compareFn(items[j], current) > 0
          : items[j] > current;

        if (!shouldSwap) break;

        items[j + 1] = items[j];
        j--;
      }

      items[j + 1] = current;
    }

    return items;
  }

  /**
   * 페이지네이션 최적화
   */
  static optimizePagination<T>(
    items: T[],
    page: number,
    limit: number,
    totalCount?: number
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    performance: {
      skipCalculation: boolean;
      memoryEfficient: boolean;
    };
  } {
    const total = totalCount ?? items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // 메모리 효율적인 슬라이싱
    const data = items.slice(offset, offset + limit);

    // 불필요한 계산 건너뛰기
    const skipCalculation = page === 1 && data.length < limit;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: skipCalculation ? 1 : totalPages,
        hasNext: !skipCalculation && page < totalPages,
        hasPrev: page > 1
      },
      performance: {
        skipCalculation,
        memoryEfficient: true
      }
    };
  }

  /**
   * 그룹화 최적화
   */
  static optimizeGroupBy<T, K extends string | number>(
    items: T[],
    keyExtractor: (item: T) => K
  ): Map<K, T[]> {
    const groups = new Map<K, T[]>();

    // 단일 순회로 그룹화 (O(n))
    for (const item of items) {
      const key = keyExtractor(item);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(item);
    }

    this.logger.debug(`Grouped ${items.length} items into ${groups.size} groups`);
    return groups;
  }
}

/**
 * 알고리즘 최적화기
 */
export class AlgorithmOptimizer {
  private static readonly logger = new Logger(AlgorithmOptimizer.name);

  /**
   * 이진 검색 최적화
   */
  static binarySearch<T>(
    sortedItems: T[],
    target: T,
    compareFn?: (a: T, b: T) => number
  ): number {
    let left = 0;
    let right = sortedItems.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compareFn 
        ? compareFn(sortedItems[mid], target)
        : sortedItems[mid] < target ? -1 : sortedItems[mid] > target ? 1 : 0;

      if (comparison === 0) {
        return mid;
      } else if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return -1; // 찾지 못함
  }

  /**
   * 최적화된 범위 검색
   */
  static findItemsInRange<T>(
    sortedItems: T[],
    min: T,
    max: T,
    compareFn?: (a: T, b: T) => number
  ): T[] {
    // 이진 검색으로 시작과 끝 인덱스 찾기
    const startIndex = this.findFirstGreaterOrEqual(sortedItems, min, compareFn);
    const endIndex = this.findLastLessOrEqual(sortedItems, max, compareFn);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      return [];
    }

    return sortedItems.slice(startIndex, endIndex + 1);
  }

  /**
   * 최적화된 필터링 (early termination)
   */
  static optimizedFilter<T>(
    items: T[],
    predicate: (item: T, index: number) => boolean,
    maxResults?: number
  ): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (predicate(items[i], i)) {
        result.push(items[i]);
        
        // 최대 결과 수에 도달하면 조기 종료
        if (maxResults && result.length >= maxResults) {
          this.logger.debug(`Early termination: found ${maxResults} results at index ${i}/${items.length}`);
          break;
        }
      }
    }

    return result;
  }

  /**
   * 최적화된 집합 연산 (교집합)
   */
  static intersection<T>(
    set1: T[],
    set2: T[],
    keyExtractor?: (item: T) => string | number
  ): T[] {
    // 작은 집합을 Set으로 변환하여 조회 성능 향상
    const [smaller, larger] = set1.length <= set2.length ? [set1, set2] : [set2, set1];
    
    let smallerSet: Set<string | number | T>;
    
    if (keyExtractor) {
      smallerSet = new Set(smaller.map(keyExtractor));
      return larger.filter(item => smallerSet.has(keyExtractor(item)));
    } else {
      smallerSet = new Set(smaller);
      return larger.filter(item => smallerSet.has(item));
    }
  }

  /**
   * 최적화된 집합 연산 (합집합)
   */
  static union<T>(
    set1: T[],
    set2: T[],
    keyExtractor?: (item: T) => string | number
  ): T[] {
    if (keyExtractor) {
      const seen = new Set<string | number>();
      const result: T[] = [];

      for (const item of [...set1, ...set2]) {
        const key = keyExtractor(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }

      return result;
    } else {
      return Array.from(new Set([...set1, ...set2]));
    }
  }

  /**
   * 첫 번째 크거나 같은 요소 찾기
   */
  private static findFirstGreaterOrEqual<T>(
    sortedItems: T[],
    target: T,
    compareFn?: (a: T, b: T) => number
  ): number {
    let left = 0;
    let right = sortedItems.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compareFn 
        ? compareFn(sortedItems[mid], target)
        : sortedItems[mid] < target ? -1 : sortedItems[mid] > target ? 1 : 0;

      if (comparison >= 0) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }

  /**
   * 마지막 작거나 같은 요소 찾기
   */
  private static findLastLessOrEqual<T>(
    sortedItems: T[],
    target: T,
    compareFn?: (a: T, b: T) => number
  ): number {
    let left = 0;
    let right = sortedItems.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compareFn 
        ? compareFn(sortedItems[mid], target)
        : sortedItems[mid] < target ? -1 : sortedItems[mid] > target ? 1 : 0;

      if (comparison <= 0) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }
}

/**
 * 메모리 최적화기
 */
export class MemoryOptimizer {
  private static readonly logger = new Logger(MemoryOptimizer.name);
  private static readonly objectPool = new Map<string, any[]>();

  /**
   * 객체 풀링 (메모리 재사용)
   */
  static getPooledObject<T>(type: string, factory: () => T): T {
    const pool = this.objectPool.get(type);
    
    if (pool && pool.length > 0) {
      const obj = pool.pop();
      this.logger.debug(`Reused pooled object: ${type}`);
      return obj;
    }

    const newObj = factory();
    this.logger.debug(`Created new object: ${type}`);
    return newObj;
  }

  /**
   * 객체 풀에 반환
   */
  static returnToPool<T>(type: string, obj: T, resetFn?: (obj: T) => void): void {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }

    const pool = this.objectPool.get(type)!;
    
    // 풀 크기 제한 (메모리 누수 방지)
    if (pool.length < 100) {
      if (resetFn) {
        resetFn(obj);
      }
      pool.push(obj);
      this.logger.debug(`Returned object to pool: ${type}`);
    }
  }

  /**
   * 메모리 사용량 모니터링
   */
  static getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  } {
    const usage = process.memoryUsage();
    
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * 가비지 컬렉션 강제 실행
   */
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.logger.debug('Forced garbage collection');
    } else {
      this.logger.warn('Garbage collection not available. Run with --expose-gc flag');
    }
  }

  /**
   * 스트림 기반 대용량 데이터 처리
   */
  static async processLargeDataset<T, R>(
    items: T[],
    processor: (item: T) => R | Promise<R>,
    batchSize: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      
      results.push(...batchResults);
      
      // 배치 처리 후 가비지 컬렉션 힌트
      if (i % (batchSize * 10) === 0) {
        this.logger.debug(`Processed ${i + batchSize}/${items.length} items`);
        
        // 메모리 사용량 체크
        const memUsage = this.getMemoryUsage();
        if (memUsage.heapUsed > 500) { // 500MB 초과 시
          this.forceGarbageCollection();
        }
      }
    }

    return results;
  }

  /**
   * 약한 참조 캐시 (WeakMap 사용)
   */
  static createWeakCache<K extends object, V>(): {
    get: (key: K) => V | undefined;
    set: (key: K, value: V) => void;
    has: (key: K) => boolean;
    delete: (key: K) => boolean;
  } {
    const cache = new WeakMap<K, V>();

    return {
      get: (key: K) => cache.get(key),
      set: (key: K, value: V) => cache.set(key, value),
      has: (key: K) => cache.has(key),
      delete: (key: K) => cache.delete(key)
    };
  }
}

/**
 * 성능 분석기
 */
export class PerformanceAnalyzer {
  private static readonly logger = new Logger(PerformanceAnalyzer.name);

  /**
   * 함수 성능 측정
   */
  static async measurePerformance<T>(
    fn: () => T | Promise<T>,
    label: string = 'Function'
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    const startMemory = MemoryOptimizer.getMemoryUsage();

    try {
      const result = await fn();
      const endTime = Date.now();
      const endMemory = MemoryOptimizer.getMemoryUsage();

      const metrics: PerformanceMetrics = {
        executionTime: endTime - startTime,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        cpuUsage: 0, // Node.js에서 정확한 CPU 사용량 측정 복잡
        operationsCount: 1,
        complexity: 'O(1)' // 기본값, 실제로는 분석 필요
      };

      this.logger.debug(`${label} performance:`, metrics);
      return { result, metrics };
    } catch (error) {
      this.logger.error(`Performance measurement failed for ${label}:`, error);
      throw error;
    }
  }

  /**
   * 알고리즘 복잡도 분석
   */
  static analyzeComplexity<T>(
    algorithm: (input: T[]) => any,
    testSizes: number[] = [10, 100, 1000, 10000]
  ): {
    estimatedComplexity: string;
    measurements: Array<{ size: number; time: number }>;
    recommendation: string;
  } {
    const measurements: Array<{ size: number; time: number }> = [];

    for (const size of testSizes) {
      const testData = Array.from({ length: size }, (_, i) => i) as unknown as T[];
      const startTime = Date.now();
      
      try {
        algorithm(testData);
        const endTime = Date.now();
        measurements.push({ size, time: endTime - startTime });
      } catch (error) {
        this.logger.warn(`Complexity analysis failed for size ${size}:`, error);
      }
    }

    // 간단한 복잡도 추정 (실제로는 더 정교한 분석 필요)
    const ratios = measurements.slice(1).map((curr, i) => 
      curr.time / measurements[i].time
    );

    let estimatedComplexity = 'O(1)';
    let recommendation = 'Performance is optimal';

    if (ratios.some(ratio => ratio > 3)) {
      estimatedComplexity = 'O(n²) or worse';
      recommendation = 'Algorithm needs optimization - consider using hash maps or trees';
    } else if (ratios.some(ratio => ratio > 1.5)) {
      estimatedComplexity = 'O(n log n)';
      recommendation = 'Consider optimizing for larger datasets';
    } else if (ratios.some(ratio => ratio > 1.1)) {
      estimatedComplexity = 'O(n)';
      recommendation = 'Linear complexity - acceptable for most cases';
    }

    return {
      estimatedComplexity,
      measurements,
      recommendation
    };
  }

  /**
   * 최적화 제안 생성
   */
  static generateOptimizationSuggestions(
    codeAnalysis: {
      hasNestedLoops: boolean;
      usesLinearSearch: boolean;
      hasLargeObjects: boolean;
      hasDuplicateCode: boolean;
      memoryUsage: number;
    }
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (codeAnalysis.hasNestedLoops) {
      suggestions.push({
        type: 'algorithm',
        severity: 'high',
        description: 'Nested loops detected',
        recommendation: 'Consider using hash maps or sets to reduce complexity',
        estimatedImpact: 70
      });
    }

    if (codeAnalysis.usesLinearSearch) {
      suggestions.push({
        type: 'algorithm',
        severity: 'medium',
        description: 'Linear search operations found',
        recommendation: 'Use binary search for sorted data or hash maps for fast lookups',
        estimatedImpact: 50
      });
    }

    if (codeAnalysis.hasLargeObjects) {
      suggestions.push({
        type: 'memory',
        severity: 'medium',
        description: 'Large objects in memory',
        recommendation: 'Implement object pooling or use streaming for large datasets',
        estimatedImpact: 40
      });
    }

    if (codeAnalysis.hasDuplicateCode) {
      suggestions.push({
        type: 'duplication',
        severity: 'low',
        description: 'Duplicate code detected',
        recommendation: 'Extract common functionality into reusable functions',
        estimatedImpact: 20
      });
    }

    if (codeAnalysis.memoryUsage > 500) {
      suggestions.push({
        type: 'memory',
        severity: 'critical',
        description: 'High memory usage detected',
        recommendation: 'Implement memory cleanup and garbage collection',
        estimatedImpact: 80
      });
    }

    return suggestions;
  }
}

/**
 * 코드 최적화 데코레이터
 */
export function OptimizePerformance(options: {
  enableMemoryMonitoring?: boolean;
  enableProfiling?: boolean;
  cacheResults?: boolean;
} = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (options.enableProfiling) {
        const { result } = await PerformanceAnalyzer.measurePerformance(
          () => originalMethod.apply(this, args),
          `${target.constructor.name}.${propertyName}`
        );
        return result;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
} 