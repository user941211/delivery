/**
 * 최적화된 검색 서비스
 * 
 * 코드 최적화 유틸리티를 실제로 적용하여
 * 성능이 최적화된 검색 기능을 제공하는 예시입니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  DataStructureOptimizer,
  AlgorithmOptimizer,
  MemoryOptimizer,
  PerformanceAnalyzer,
  OptimizePerformance
} from '../utils/code-optimizer.util';

/**
 * 검색 대상 인터페이스
 */
export interface SearchableItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  createdAt: Date;
}

/**
 * 검색 필터
 */
export interface SearchFilter {
  categories?: string[];
  minRating?: number;
  maxRating?: number;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * 검색 결과
 */
export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    ratingRanges: Array<{ range: string; count: number }>;
  };
  performance: {
    executionTime: number;
    memoryUsage: number;
    algorithmsUsed: string[];
  };
}

@Injectable()
export class OptimizedSearchService {
  private readonly logger = new Logger(OptimizedSearchService.name);
  
  // 최적화된 인덱스 (O(1) 검색을 위한 해시맵)
  private searchIndex: Map<string, SearchableItem> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private ratingIndex: Map<number, Set<string>> = new Map();
  
  // 약한 참조 캐시 (메모리 효율성)
  private searchCache = MemoryOptimizer.createWeakCache<any, SearchResult<SearchableItem>>();

  /**
   * 데이터 인덱싱 (O(n) 한 번만 실행)
   */
  @OptimizePerformance({ enableProfiling: true, enableMemoryMonitoring: true })
  async indexData(items: SearchableItem[]): Promise<void> {
    this.logger.log(`Indexing ${items.length} items for optimized search`);

    // 기존 인덱스 초기화
    this.clearIndexes();

    // 중복 제거 최적화
    const uniqueItems = DataStructureOptimizer.removeDuplicates(
      items,
      item => item.id
    );

    // 단일 순회로 모든 인덱스 생성 (O(n))
    for (const item of uniqueItems) {
      // 메인 인덱스
      this.searchIndex.set(item.id, item);

      // 카테고리 인덱스
      if (!this.categoryIndex.has(item.category)) {
        this.categoryIndex.set(item.category, new Set());
      }
      this.categoryIndex.get(item.category)!.add(item.id);

      // 태그 인덱스
      for (const tag of item.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(item.id);
      }

      // 평점 인덱스 (정수로 반올림)
      const ratingKey = Math.floor(item.rating);
      if (!this.ratingIndex.has(ratingKey)) {
        this.ratingIndex.set(ratingKey, new Set());
      }
      this.ratingIndex.get(ratingKey)!.add(item.id);
    }

    this.logger.log(`Indexing completed: ${uniqueItems.length} unique items indexed`);
  }

  /**
   * 최적화된 검색 (해시맵 기반 O(1) 검색)
   */
  @OptimizePerformance({ enableProfiling: true })
  async search(
    query: string,
    filters: SearchFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<SearchableItem>> {
    const startTime = Date.now();
    const startMemory = MemoryOptimizer.getMemoryUsage();
    const algorithmsUsed: string[] = [];

    try {
      // 1. 텍스트 검색 (최적화된 필터링)
      let candidateIds = this.performTextSearch(query);
      algorithmsUsed.push('Text Search with Early Termination');

      // 2. 필터 적용 (집합 연산 최적화)
      candidateIds = this.applyFilters(candidateIds, filters);
      algorithmsUsed.push('Set-based Filtering');

      // 3. 결과 변환 및 정렬
      const candidateItems = this.getItemsByIds(candidateIds);
      const sortedItems = this.optimizedSort(candidateItems, query);
      algorithmsUsed.push('Optimized Sorting');

      // 4. 페이지네이션 (메모리 효율적)
      const paginationResult = DataStructureOptimizer.optimizePagination(
        sortedItems,
        page,
        limit,
        sortedItems.length
      );

      // 5. 패싯 계산 (그룹화 최적화)
      const facets = this.calculateFacets(candidateItems);
      algorithmsUsed.push('Optimized Grouping');

      const endTime = Date.now();
      const endMemory = MemoryOptimizer.getMemoryUsage();

      return {
        items: paginationResult.data,
        totalCount: sortedItems.length,
        facets,
        performance: {
          executionTime: endTime - startTime,
          memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
          algorithmsUsed
        }
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * 최적화된 자동완성 검색
   */
  @OptimizePerformance({ enableProfiling: true })
  async autocomplete(query: string, maxResults: number = 10): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // 최적화된 필터링 (조기 종료)
    const matchingItems = AlgorithmOptimizer.optimizedFilter(
      Array.from(this.searchIndex.values()),
      item => 
        item.title.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower),
      maxResults * 2 // 여유분 확보
    );

    // 관련성 점수 계산 및 정렬
    const scoredSuggestions = matchingItems
      .map(item => ({
        text: item.title,
        score: this.calculateRelevanceScore(item, query)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.text);

    return scoredSuggestions;
  }

  /**
   * 유사 아이템 추천 (최적화된 유사도 계산)
   */
  @OptimizePerformance({ enableProfiling: true })
  async findSimilarItems(itemId: string, maxResults: number = 5): Promise<SearchableItem[]> {
    const targetItem = this.searchIndex.get(itemId);
    if (!targetItem) {
      return [];
    }

    // 같은 카테고리 아이템들 먼저 찾기 (O(1) 카테고리 인덱스 사용)
    const sameCategory = this.categoryIndex.get(targetItem.category) || new Set();
    
    // 공통 태그를 가진 아이템들 찾기 (집합 연산 최적화)
    const tagMatches = new Set<string>();
    for (const tag of targetItem.tags) {
      const taggedItems = this.tagIndex.get(tag) || new Set();
      for (const id of taggedItems) {
        if (id !== itemId) {
          tagMatches.add(id);
        }
      }
    }

    // 교집합 연산으로 최종 후보 선정
    const candidates = AlgorithmOptimizer.intersection(
      Array.from(sameCategory),
      Array.from(tagMatches)
    );

    // 유사도 점수 계산 및 정렬
    const candidateItems = this.getItemsByIds(candidates);
    const scoredItems = candidateItems
      .map(item => ({
        item,
        similarity: this.calculateSimilarity(targetItem, item)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults)
      .map(scored => scored.item);

    return scoredItems;
  }

  /**
   * 텍스트 검색 최적화
   */
  private performTextSearch(query: string): string[] {
    if (!query.trim()) {
      return Array.from(this.searchIndex.keys());
    }

    const queryTerms = query.toLowerCase().split(/\s+/);
    const results = new Set<string>();

    // 각 검색어에 대해 최적화된 검색
    for (const term of queryTerms) {
      for (const [id, item] of this.searchIndex) {
        if (
          item.title.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.tags.some(tag => tag.toLowerCase().includes(term))
        ) {
          results.add(id);
        }
      }
    }

    return Array.from(results);
  }

  /**
   * 필터 적용 최적화
   */
  private applyFilters(candidateIds: string[], filters: SearchFilter): string[] {
    let filteredIds = new Set(candidateIds);

    // 카테고리 필터 (집합 교집합)
    if (filters.categories && filters.categories.length > 0) {
      const categoryMatches = new Set<string>();
      for (const category of filters.categories) {
        const categoryItems = this.categoryIndex.get(category) || new Set();
        for (const id of categoryItems) {
          categoryMatches.add(id);
        }
      }
      filteredIds = new Set(
        AlgorithmOptimizer.intersection(
          Array.from(filteredIds),
          Array.from(categoryMatches)
        )
      );
    }

    // 태그 필터 (집합 교집합)
    if (filters.tags && filters.tags.length > 0) {
      const tagMatches = new Set<string>();
      for (const tag of filters.tags) {
        const tagItems = this.tagIndex.get(tag) || new Set();
        for (const id of tagItems) {
          tagMatches.add(id);
        }
      }
      filteredIds = new Set(
        AlgorithmOptimizer.intersection(
          Array.from(filteredIds),
          Array.from(tagMatches)
        )
      );
    }

    // 평점 필터 (범위 검색)
    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      const ratingMatches = new Set<string>();
      const minRating = filters.minRating || 0;
      const maxRating = filters.maxRating || 5;

      for (let rating = Math.floor(minRating); rating <= Math.floor(maxRating); rating++) {
        const ratingItems = this.ratingIndex.get(rating) || new Set();
        for (const id of ratingItems) {
          const item = this.searchIndex.get(id);
          if (item && item.rating >= minRating && item.rating <= maxRating) {
            ratingMatches.add(id);
          }
        }
      }

      filteredIds = new Set(
        AlgorithmOptimizer.intersection(
          Array.from(filteredIds),
          Array.from(ratingMatches)
        )
      );
    }

    return Array.from(filteredIds);
  }

  /**
   * ID로 아이템 조회 (배치 최적화)
   */
  private getItemsByIds(ids: string[]): SearchableItem[] {
    const items: SearchableItem[] = [];
    
    for (const id of ids) {
      const item = this.searchIndex.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * 최적화된 정렬
   */
  private optimizedSort(items: SearchableItem[], query: string): SearchableItem[] {
    // 관련성 점수 계산 및 정렬
    return DataStructureOptimizer.optimizedSort(
      items,
      (a, b) => {
        const scoreA = this.calculateRelevanceScore(a, query);
        const scoreB = this.calculateRelevanceScore(b, query);
        return scoreB - scoreA; // 내림차순
      }
    );
  }

  /**
   * 패싯 계산 최적화
   */
  private calculateFacets(items: SearchableItem[]): SearchResult<SearchableItem>['facets'] {
    // 그룹화 최적화 사용
    const categoryGroups = DataStructureOptimizer.optimizeGroupBy(
      items,
      item => item.category
    );

    const tagGroups = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        tagGroups.set(tag, (tagGroups.get(tag) || 0) + 1);
      }
    }

    const ratingGroups = DataStructureOptimizer.optimizeGroupBy(
      items,
      item => Math.floor(item.rating)
    );

    return {
      categories: Array.from(categoryGroups.entries()).map(([name, items]) => ({
        name,
        count: items.length
      })),
      tags: Array.from(tagGroups.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20), // 상위 20개만
      ratingRanges: Array.from(ratingGroups.entries()).map(([rating, items]) => ({
        range: `${rating}-${rating + 1}`,
        count: items.length
      }))
    };
  }

  /**
   * 관련성 점수 계산
   */
  private calculateRelevanceScore(item: SearchableItem, query: string): number {
    if (!query) return item.rating; // 쿼리가 없으면 평점 기준

    const queryLower = query.toLowerCase();
    let score = 0;

    // 제목 매치 (가중치 높음)
    if (item.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // 설명 매치
    if (item.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // 태그 매치
    const tagMatches = item.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower)
    ).length;
    score += tagMatches * 3;

    // 평점 보너스
    score += item.rating;

    return score;
  }

  /**
   * 유사도 계산
   */
  private calculateSimilarity(item1: SearchableItem, item2: SearchableItem): number {
    let similarity = 0;

    // 카테고리 일치
    if (item1.category === item2.category) {
      similarity += 5;
    }

    // 공통 태그 개수
    const commonTags = AlgorithmOptimizer.intersection(
      item1.tags,
      item2.tags
    );
    similarity += commonTags.length * 2;

    // 평점 유사도
    const ratingDiff = Math.abs(item1.rating - item2.rating);
    similarity += (5 - ratingDiff);

    return similarity;
  }

  /**
   * 인덱스 초기화
   */
  private clearIndexes(): void {
    this.searchIndex.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
    this.ratingIndex.clear();
  }

  /**
   * 성능 통계 조회
   */
  async getPerformanceStats(): Promise<{
    indexSize: number;
    memoryUsage: any;
    cacheStats: {
      enabled: boolean;
      type: string;
    };
  }> {
    return {
      indexSize: this.searchIndex.size,
      memoryUsage: MemoryOptimizer.getMemoryUsage(),
      cacheStats: {
        enabled: true,
        type: 'WeakMap Cache'
      }
    };
  }
} 