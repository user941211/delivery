/**
 * 비동기 처리 최적화 유틸리티
 * 
 * 병렬 처리, 재시도, 타임아웃, 큐 관리 등을 통해 
 * 비동기 작업의 성능과 안정성을 개선합니다.
 */

import { Logger } from '@nestjs/common';

/**
 * 재시도 옵션
 */
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoffFactor?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * 타임아웃 옵션
 */
export interface TimeoutOptions {
  timeout: number;
  timeoutMessage?: string;
}

/**
 * 병렬 처리 옵션
 */
export interface ParallelOptions {
  concurrency: number;
  failFast?: boolean;
  collectErrors?: boolean;
}

/**
 * 큐 처리 옵션
 */
export interface QueueOptions {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout?: number;
  priority?: boolean;
}

/**
 * 작업 우선순위
 */
export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

/**
 * 큐 작업 인터페이스
 */
interface QueuedTask<T> {
  id: string;
  task: () => Promise<T>;
  priority: Priority;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  createdAt: Date;
  timeout?: number;
}

/**
 * 비동기 최적화 유틸리티 클래스
 */
export class AsyncOptimizer {
  private static readonly logger = new Logger(AsyncOptimizer.name);

  /**
   * 재시도 기능이 있는 비동기 작업 실행
   */
  static async withRetry<T>(
    task: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const { maxAttempts, delay, backoffFactor = 2, maxDelay = 30000, retryCondition } = options;
    let lastError: any;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await task();
        
        if (attempt > 1) {
          this.logger.log(`Task succeeded on attempt ${attempt}/${maxAttempts}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // 재시도 조건 확인
        if (retryCondition && !retryCondition(error)) {
          this.logger.warn(`Task failed with non-retryable error: ${error.message}`);
          throw error;
        }

        // 마지막 시도인 경우
        if (attempt === maxAttempts) {
          this.logger.error(`Task failed after ${maxAttempts} attempts: ${error.message}`);
          throw error;
        }

        // 재시도 전 대기
        this.logger.warn(`Task failed on attempt ${attempt}/${maxAttempts}, retrying in ${currentDelay}ms: ${error.message}`);
        await this.sleep(currentDelay);
        
        // 지수 백오프
        currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * 타임아웃 기능이 있는 비동기 작업 실행
   */
  static async withTimeout<T>(
    task: () => Promise<T>,
    options: TimeoutOptions
  ): Promise<T> {
    const { timeout, timeoutMessage = 'Operation timed out' } = options;

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${timeoutMessage} after ${timeout}ms`));
      }, timeout);

      task()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 제한된 동시 실행으로 병렬 처리
   */
  static async parallel<T>(
    tasks: Array<() => Promise<T>>,
    options: ParallelOptions
  ): Promise<T[]> {
    const { concurrency, failFast = true, collectErrors = false } = options;
    const results: T[] = [];
    const errors: any[] = [];
    let index = 0;

    const executeTask = async (): Promise<void> => {
      while (index < tasks.length) {
        const currentIndex = index++;
        const task = tasks[currentIndex];

        try {
          const result = await task();
          results[currentIndex] = result;
        } catch (error) {
          if (collectErrors) {
            errors.push({ index: currentIndex, error });
          }

          if (failFast) {
            throw error;
          }
        }
      }
    };

    const workers = Array(Math.min(concurrency, tasks.length))
      .fill(null)
      .map(() => executeTask());

    try {
      await Promise.all(workers);
    } catch (error) {
      if (failFast) {
        throw error;
      }
    }

    if (errors.length > 0 && !failFast) {
      this.logger.warn(`${errors.length} tasks failed during parallel execution`);
      
      if (collectErrors) {
        return results; // 부분 결과 반환
      }
    }

    return results;
  }

  /**
   * 배치 처리 (청크 단위로 병렬 실행)
   */
  static async batch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number,
    concurrency: number = 3
  ): Promise<R[]> {
    const batches: T[][] = [];
    
    // 배치로 분할
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    this.logger.debug(`Processing ${items.length} items in ${batches.length} batches (size: ${batchSize}, concurrency: ${concurrency})`);

    const results: R[] = [];

    // 배치를 동시 실행 제한으로 처리
    await this.parallel(
      batches.map(batch => async () => {
        const batchResults = await Promise.all(
          batch.map(item => processor(item))
        );
        results.push(...batchResults);
        return batchResults;
      }),
      { concurrency, failFast: false }
    );

    return results;
  }

  /**
   * 우선순위 큐
   */
  static createPriorityQueue<T>(options: QueueOptions) {
    return new PriorityQueue<T>(options);
  }

  /**
   * 응답 시간 측정
   */
  static async measureTime<T>(
    task: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    
    try {
      const result = await task();
      const duration = Date.now() - startTime;
      
      if (label) {
        this.logger.debug(`${label} completed in ${duration}ms`);
      }
      
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (label) {
        this.logger.error(`${label} failed after ${duration}ms: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * 메모이제이션 (결과 캐싱)
   */
  static memoize<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator?: (...args: T) => string,
    ttl: number = 300000 // 5분
  ): (...args: T) => Promise<R> {
    const cache = new Map<string, { value: R; expiry: number }>();

    return async (...args: T): Promise<R> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const now = Date.now();
      
      // 캐시 확인
      const cached = cache.get(key);
      if (cached && cached.expiry > now) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return cached.value;
      }

      // 캐시 미스 - 함수 실행
      this.logger.debug(`Cache miss for key: ${key}`);
      const result = await fn(...args);
      
      // 결과 캐싱
      cache.set(key, {
        value: result,
        expiry: now + ttl
      });

      // 만료된 캐시 정리
      this.cleanupExpiredCache(cache);

      return result;
    };
  }

  /**
   * 디바운스 (연속 호출 방지)
   */
  static debounce<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    delay: number
  ): (...args: T) => Promise<R> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPromise: Promise<R> | null = null;

    return (...args: T): Promise<R> => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (pendingPromise) {
        return pendingPromise;
      }

      pendingPromise = new Promise<R>((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeoutId = null;
          }
        }, delay);
      });

      return pendingPromise;
    };
  }

  /**
   * 스로틀 (호출 빈도 제한)
   */
  static throttle<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    limit: number
  ): (...args: T) => Promise<R> {
    let inThrottle = false;
    let lastResult: R;

    return async (...args: T): Promise<R> => {
      if (!inThrottle) {
        inThrottle = true;
        lastResult = await fn(...args);
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
      
      return lastResult;
    };
  }

  /**
   * 만료된 캐시 정리
   */
  private static cleanupExpiredCache(cache: Map<string, { value: any; expiry: number }>): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of cache.entries()) {
      if (entry.expiry <= now) {
        cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 지연 함수
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 우선순위 큐 클래스
 */
export class PriorityQueue<T> {
  private readonly logger = new Logger(PriorityQueue.name);
  private readonly queue: QueuedTask<T>[] = [];
  private readonly running = new Set<string>();
  private readonly options: QueueOptions;

  constructor(options: QueueOptions) {
    this.options = options;
  }

  /**
   * 작업을 큐에 추가
   */
  async add(
    task: () => Promise<T>,
    priority: Priority = Priority.NORMAL,
    timeout?: number
  ): Promise<T> {
    // 큐 크기 확인
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const taskId = this.generateTaskId();
    
    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask<T> = {
        id: taskId,
        task,
        priority,
        resolve,
        reject,
        createdAt: new Date(),
        timeout: timeout || this.options.timeout
      };

      // 우선순위에 따라 삽입 위치 결정
      const insertIndex = this.findInsertPosition(priority);
      this.queue.splice(insertIndex, 0, queuedTask);

      this.logger.debug(`Task ${taskId} added to queue (priority: ${priority}, position: ${insertIndex})`);
      
      // 작업 처리 시작
      this.processQueue();
    });
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.running.size >= this.options.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const queuedTask = this.queue.shift();
    if (!queuedTask) {
      return;
    }

    this.running.add(queuedTask.id);
    
    try {
      let taskPromise = queuedTask.task();
      
      // 타임아웃 적용
      if (queuedTask.timeout) {
        taskPromise = AsyncOptimizer.withTimeout(
          () => queuedTask.task(),
          {
            timeout: queuedTask.timeout,
            timeoutMessage: `Queue task ${queuedTask.id} timed out`
          }
        );
      }

      const result = await taskPromise;
      queuedTask.resolve(result);
      
      this.logger.debug(`Task ${queuedTask.id} completed successfully`);
    } catch (error) {
      queuedTask.reject(error);
      this.logger.error(`Task ${queuedTask.id} failed: ${error.message}`);
    } finally {
      this.running.delete(queuedTask.id);
      
      // 다음 작업 처리
      this.processQueue();
    }
  }

  /**
   * 우선순위에 따른 삽입 위치 찾기
   */
  private findInsertPosition(priority: Priority): number {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < priority) {
        return i;
      }
    }
    return this.queue.length;
  }

  /**
   * 작업 ID 생성
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 큐 상태 조회
   */
  getStats(): {
    queueSize: number;
    runningTasks: number;
    maxConcurrent: number;
    maxQueueSize: number;
  } {
    return {
      queueSize: this.queue.length,
      runningTasks: this.running.size,
      maxConcurrent: this.options.maxConcurrent,
      maxQueueSize: this.options.maxQueueSize
    };
  }
}

/**
 * 성능 프로파일러
 */
export class PerformanceProfiler {
  private static readonly logger = new Logger(PerformanceProfiler.name);
  private static profiles = new Map<string, {
    calls: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
  }>();

  /**
   * 함수 성능 프로파일링
   */
  static profile<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      let error: any = null;

      try {
        const result = await fn(...args);
        this.recordMetrics(name, Date.now() - startTime, false);
        return result;
      } catch (err) {
        error = err;
        this.recordMetrics(name, Date.now() - startTime, true);
        throw err;
      }
    };
  }

  /**
   * 메트릭 기록
   */
  private static recordMetrics(name: string, duration: number, isError: boolean): void {
    let profile = this.profiles.get(name);
    
    if (!profile) {
      profile = {
        calls: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0
      };
      this.profiles.set(name, profile);
    }

    profile.calls++;
    profile.totalTime += duration;
    profile.avgTime = profile.totalTime / profile.calls;
    profile.minTime = Math.min(profile.minTime, duration);
    profile.maxTime = Math.max(profile.maxTime, duration);
    
    if (isError) {
      profile.errors++;
    }
  }

  /**
   * 프로파일링 결과 조회
   */
  static getProfiles(): Map<string, any> {
    return new Map(this.profiles);
  }

  /**
   * 프로파일링 결과 리셋
   */
  static resetProfiles(): void {
    this.profiles.clear();
  }

  /**
   * 성능 보고서 출력
   */
  static printReport(): void {
    this.logger.log('=== Performance Report ===');
    
    for (const [name, profile] of this.profiles) {
      const errorRate = (profile.errors / profile.calls) * 100;
      
      this.logger.log(`${name}:
        Calls: ${profile.calls}
        Total Time: ${profile.totalTime}ms
        Avg Time: ${profile.avgTime.toFixed(2)}ms
        Min Time: ${profile.minTime}ms
        Max Time: ${profile.maxTime}ms
        Error Rate: ${errorRate.toFixed(2)}%`);
    }
  }
} 