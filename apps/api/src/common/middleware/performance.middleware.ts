/**
 * 성능 최적화 미들웨어
 * 
 * API 응답 시간 개선을 위한 다양한 성능 최적화 기능을 제공합니다.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as compression from 'compression';

/**
 * 응답 시간 측정 및 압축 미들웨어
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // 응답 시간 측정 시작
    const startTime = Date.now();

    // 요청 ID 생성 (추적용)
    const requestId = this.generateRequestId();
    req.headers['x-request-id'] = requestId;

    // 응답 헤더에 성능 정보 추가
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-API-Version', '1.0');

    // 원본 응답 전송 함수 저장
    const originalSend = res.send.bind(res);
    const middleware = this;

    // 응답 전송 시 성능 정보 추가
    res.send = function(this: Response, body: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 성능 헤더 추가
      this.setHeader('X-Response-Time', `${responseTime}ms`);
      this.setHeader('X-Content-Encoding', this.getHeader('content-encoding') || 'none');

      // 느린 응답 로깅 (200ms 이상)
      if (responseTime > 200) {
        middleware.logger.warn(`Slow API response: ${req.method} ${req.path} - ${responseTime}ms`, {
          requestId,
          method: req.method,
          path: req.path,
          responseTime,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }

      // 성능 메트릭 수집 (실제 환경에서는 모니터링 시스템으로 전송)
      middleware.collectPerformanceMetrics(req, this, responseTime);

      return originalSend.call(this, body);
    };

    next();
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 성능 메트릭 수집
   */
  private collectPerformanceMetrics(req: Request, res: Response, responseTime: number): void {
    // 실제 환경에서는 이 데이터를 모니터링 시스템으로 전송
    const metrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.getHeader('content-length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    };

    // 개발 환경에서는 로그로 출력
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug('Performance metrics collected', metrics);
    }
  }
}

/**
 * 응답 압축 설정 함수
 */
export function createCompressionMiddleware() {
  return compression({
    // 압축 레벨 (1-9, 6이 기본값)
    level: 6,
    
    // 압축할 최소 크기 (bytes)
    threshold: 1024,
    
    // 압축할 Content-Type 필터
    filter: (req: Request, res: Response) => {
      // 이미 압축된 응답은 제외
      if (res.getHeader('content-encoding')) {
        return false;
      }

      // 특정 Content-Type만 압축
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        return (
          contentType.includes('application/json') ||
          contentType.includes('text/html') ||
          contentType.includes('text/css') ||
          contentType.includes('text/javascript') ||
          contentType.includes('application/javascript')
        );
      }

      return compression.filter(req, res);
    },

    // 압축 메모리 레벨 (1-9)
    memLevel: 8
  });
}

/**
 * 응답 시간 헤더 추가 미들웨어
 */
export function createResponseTimeMiddleware() {
  return responseTime((req: Request, res: Response, time: number) => {
    // 응답 시간을 헤더에 추가
    res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
    
    // 매우 느린 응답 경고 (1초 이상)
    if (time > 1000) {
      console.warn(`Very slow API response: ${req.method} ${req.path} - ${time.toFixed(2)}ms`);
    }
  });
}

/**
 * API 응답 구조 최적화 함수
 */
export class ResponseOptimizer {
  private static readonly logger = new Logger(ResponseOptimizer.name);

  /**
   * 응답 데이터에서 불필요한 필드 제거
   */
  static removeUnnecessaryFields<T>(data: T, fieldsToRemove: string[]): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.removeUnnecessaryFields(item, fieldsToRemove)) as T;
    }

    const cleaned = { ...data } as any;
    
    fieldsToRemove.forEach(field => {
      if (field.includes('.')) {
        // 중첩된 필드 처리 (예: "user.password")
        const [parentField, childField] = field.split('.');
        if (cleaned[parentField] && typeof cleaned[parentField] === 'object') {
          delete cleaned[parentField][childField];
        }
      } else {
        delete cleaned[field];
      }
    });

    return cleaned;
  }

  /**
   * 대용량 배열 데이터 페이지네이션 최적화
   */
  static optimizePagination<T>(
    items: T[],
    page: number,
    limit: number,
    selectFields?: string[]
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
  } {
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    let paginatedData = items.slice(offset, offset + limit);

    // 필드 선택 최적화
    if (selectFields && selectFields.length > 0) {
      paginatedData = this.selectFields(paginatedData, selectFields);
    }

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 지정된 필드만 선택
   */
  static selectFields<T>(data: T[], fields: string[]): T[] {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map(item => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const selected: any = {};
      fields.forEach(field => {
        if (field.includes('.')) {
          // 중첩된 필드 처리
          const [parentField, childField] = field.split('.');
          if ((item as any)[parentField]) {
            if (!selected[parentField]) {
              selected[parentField] = {};
            }
            selected[parentField][childField] = (item as any)[parentField][childField];
          }
        } else {
          selected[field] = (item as any)[field];
        }
      });
      
      return selected;
    }) as T[];
  }

  /**
   * 응답 크기 분석
   */
  static analyzeResponseSize(data: any): {
    sizeInBytes: number;
    sizeInKB: number;
    fieldCount: number;
    arrayLength?: number;
    suggestions: string[];
  } {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;

    let fieldCount = 0;
    let arrayLength: number | undefined;
    const suggestions: string[] = [];

    if (Array.isArray(data)) {
      arrayLength = data.length;
      if (data.length > 0) {
        fieldCount = Object.keys(data[0]).length;
      }

      // 큰 배열에 대한 제안
      if (arrayLength > 100) {
        suggestions.push('Consider implementing pagination for large arrays');
      }
      if (fieldCount > 20) {
        suggestions.push('Consider using field selection to reduce response size');
      }
    } else if (typeof data === 'object' && data !== null) {
      fieldCount = Object.keys(data).length;
    }

    // 크기 기반 제안
    if (sizeInKB > 100) {
      suggestions.push('Response size is large (>100KB). Consider compression or data reduction');
    }
    if (sizeInKB > 500) {
      suggestions.push('Response size is very large (>500KB). Strongly recommend optimization');
    }

    return {
      sizeInBytes,
      sizeInKB,
      fieldCount,
      arrayLength,
      suggestions
    };
  }

  /**
   * 민감한 정보 제거 (보안 최적화)
   */
  static sanitizeResponse<T>(data: T): T {
    const sensitiveFields = [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'secret',
      'privateKey',
      'apiKey',
      'internalId',
      'ssn',
      'creditCard'
    ];

    return this.removeUnnecessaryFields(data, sensitiveFields);
  }
}

/**
 * 병렬 처리 유틸리티
 */
export class ParallelProcessor {
  private static readonly logger = new Logger(ParallelProcessor.name);

  /**
   * 병렬 데이터 로딩
   */
  static async loadDataParallel<T>(
    loaders: Array<() => Promise<T>>
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      const results = await Promise.all(loaders.map(loader => loader()));
      
      const endTime = Date.now();
      this.logger.debug(`Parallel loading completed in ${endTime - startTime}ms for ${loaders.length} operations`);
      
      return results;
    } catch (error) {
      this.logger.error('Parallel loading failed', error);
      throw error;
    }
  }

  /**
   * 병렬 데이터 로딩 (에러 허용)
   */
  static async loadDataParallelSettled<T>(
    loaders: Array<() => Promise<T>>
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
    const startTime = Date.now();
    
    const results = await Promise.allSettled(loaders.map(loader => loader()));
    
    const endTime = Date.now();
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    this.logger.debug(
      `Parallel loading (settled) completed in ${endTime - startTime}ms. ` +
      `${successCount}/${loaders.length} operations succeeded`
    );
    
    return results.map(result => ({
      status: result.status,
      value: result.status === 'fulfilled' ? result.value : undefined,
      reason: result.status === 'rejected' ? result.reason : undefined
    }));
  }

  /**
   * 배치 처리로 대용량 데이터 병렬 처리
   */
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    concurrency: number = 3
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];

    // 배치로 분할
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    this.logger.debug(`Processing ${items.length} items in ${batches.length} batches with concurrency ${concurrency}`);

    // 배치를 병렬로 처리 (동시 실행 수 제한)
    for (let i = 0; i < batches.length; i += concurrency) {
      const currentBatches = batches.slice(i, i + concurrency);
      
      const batchPromises = currentBatches.map(async (batch) => {
        const batchResults = await Promise.all(
          batch.map(item => processor(item))
        );
        return batchResults;
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(batchResult => {
        results.push(...batchResult);
      });

      this.logger.debug(`Completed batch ${Math.min(i + concurrency, batches.length)}/${batches.length}`);
    }

    return results;
  }
} 