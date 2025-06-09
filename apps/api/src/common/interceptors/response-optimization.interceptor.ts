/**
 * 응답 최적화 인터셉터
 * 
 * API 응답을 자동으로 최적화하여 크기를 줄이고 성능을 개선합니다.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 응답 최적화 옵션
 */
export interface ResponseOptimizationOptions {
  removeFields?: string[];
  selectFields?: string[];
  maxResponseSize?: number; // KB 단위
  enableCompression?: boolean;
  sanitize?: boolean;
}

@Injectable()
export class ResponseOptimizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseOptimizationInterceptor.name);

  constructor(private readonly options: ResponseOptimizationOptions = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map(data => this.optimizeResponse(data, request, response)),
      tap(() => {
        const responseTime = Date.now() - startTime;
        
        // 응답 시간 헤더 추가
        response.setHeader('X-Response-Time', `${responseTime}ms`);
        
        // 성능 로깅
        if (responseTime > 500) {
          this.logger.warn(`Slow response: ${request.method} ${request.path} - ${responseTime}ms`);
        }
      })
    );
  }

  /**
   * 응답 데이터 최적화
   */
  private optimizeResponse(data: any, request: Request, response: Response): any {
    if (!data) {
      return data;
    }

    const startTime = Date.now();
    let optimizedData = data;

    try {
      // 1. 민감한 정보 제거 (보안)
      if (this.options.sanitize !== false) {
        optimizedData = this.sanitizeData(optimizedData);
      }

      // 2. 불필요한 필드 제거
      if (this.options.removeFields && this.options.removeFields.length > 0) {
        optimizedData = this.removeFields(optimizedData, this.options.removeFields);
      }

      // 3. 필드 선택 (쿼리 파라미터 또는 옵션)
      const selectFields = this.getSelectFields(request);
      if (selectFields && selectFields.length > 0) {
        optimizedData = this.selectFields(optimizedData, selectFields);
      }

      // 4. 응답 크기 분석 및 경고
      const sizeAnalysis = this.analyzeResponseSize(optimizedData);
      
      if (sizeAnalysis.sizeInKB > (this.options.maxResponseSize || 100)) {
        this.logger.warn(`Large response detected: ${sizeAnalysis.sizeInKB}KB for ${request.method} ${request.path}`, {
          sizeInKB: sizeAnalysis.sizeInKB,
          suggestions: sizeAnalysis.suggestions
        });
      }

      // 5. 최적화 헤더 추가
      response.setHeader('X-Response-Size', `${sizeAnalysis.sizeInKB}KB`);
      response.setHeader('X-Optimization-Time', `${Date.now() - startTime}ms`);

      // 6. 구조화된 응답 형식
      if (this.shouldWrapResponse(request)) {
        return this.wrapResponse(optimizedData, sizeAnalysis, request);
      }

      return optimizedData;
    } catch (error) {
      this.logger.error('Response optimization failed', error);
      return data; // 최적화 실패 시 원본 반환
    }
  }

  /**
   * 민감한 정보 제거
   */
  private sanitizeData(data: any): any {
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
      'creditCard',
      'bankAccount'
    ];

    return this.removeFields(data, sensitiveFields);
  }

  /**
   * 필드 제거
   */
  private removeFields(data: any, fieldsToRemove: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.removeFields(item, fieldsToRemove));
    }

    const cleaned = { ...data };
    
    fieldsToRemove.forEach(field => {
      if (field.includes('.')) {
        // 중첩된 필드 처리
        const parts = field.split('.');
        let current = cleaned;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]] && typeof current[parts[i]] === 'object') {
            current = current[parts[i]];
          } else {
            return;
          }
        }
        
        delete current[parts[parts.length - 1]];
      } else {
        delete cleaned[field];
      }
    });

    return cleaned;
  }

  /**
   * 필드 선택
   */
  private selectFields(data: any, fields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.selectFields(item, fields));
    }

    const selected: any = {};
    
    fields.forEach(field => {
      if (field.includes('.')) {
        // 중첩된 필드 처리
        const parts = field.split('.');
        let source = data;
        let target = selected;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (source[parts[i]]) {
            if (!target[parts[i]]) {
              target[parts[i]] = {};
            }
            source = source[parts[i]];
            target = target[parts[i]];
          } else {
            return;
          }
        }
        
        const lastPart = parts[parts.length - 1];
        if (source[lastPart] !== undefined) {
          target[lastPart] = source[lastPart];
        }
      } else {
        if (data[field] !== undefined) {
          selected[field] = data[field];
        }
      }
    });

    return selected;
  }

  /**
   * 쿼리 파라미터에서 선택 필드 추출
   */
  private getSelectFields(request: Request): string[] | null {
    const selectParam = request.query.select as string;
    const fieldsParam = request.query.fields as string;
    
    const selectString = selectParam || fieldsParam;
    
    if (!selectString) {
      return this.options.selectFields || null;
    }

    return selectString.split(',').map(field => field.trim()).filter(field => field);
  }

  /**
   * 응답 크기 분석
   */
  private analyzeResponseSize(data: any): {
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
      if (data.length > 0 && typeof data[0] === 'object') {
        fieldCount = Object.keys(data[0]).length;
      }

      // 최적화 제안
      if (arrayLength > 50) {
        suggestions.push('Consider implementing pagination for large arrays');
      }
      if (fieldCount > 15) {
        suggestions.push('Consider using field selection (?fields=id,name,...)');
      }
    } else if (typeof data === 'object' && data !== null) {
      fieldCount = Object.keys(data).length;
      
      if (fieldCount > 30) {
        suggestions.push('Consider reducing the number of returned fields');
      }
    }

    // 크기 기반 제안
    if (sizeInKB > 50) {
      suggestions.push('Response size is large. Consider enabling compression');
    }
    if (sizeInKB > 200) {
      suggestions.push('Response size is very large. Strongly recommend data reduction');
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
   * 응답을 래핑해야 하는지 확인
   */
  private shouldWrapResponse(request: Request): boolean {
    // API 버전이나 클라이언트 요구사항에 따라 결정
    const wrapParam = request.query.wrap as string;
    const acceptHeader = request.get('Accept');
    
    return (
      wrapParam === 'true' ||
      acceptHeader?.includes('application/vnd.api+json') ||
      request.path.startsWith('/api/v2') // v2 API는 항상 래핑
    );
  }

  /**
   * 구조화된 응답으로 래핑
   */
  private wrapResponse(data: any, sizeAnalysis: any, request: Request): any {
    const isArray = Array.isArray(data);
    
    return {
      success: true,
      data: isArray ? data : data,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.path,
        method: request.method,
        ...(isArray && {
          total: data.length,
          count: data.length
        }),
        performance: {
          sizeKB: sizeAnalysis.sizeInKB,
          fieldCount: sizeAnalysis.fieldCount,
          ...(sizeAnalysis.arrayLength && {
            arrayLength: sizeAnalysis.arrayLength
          })
        },
        ...(sizeAnalysis.suggestions.length > 0 && {
          optimizationSuggestions: sizeAnalysis.suggestions
        })
      }
    };
  }
}

/**
 * 응답 최적화 데코레이터
 */
export function OptimizeResponse(options: ResponseOptimizationOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // 메서드별 최적화 옵션을 메타데이터로 저장
    Reflect.defineMetadata('optimization_options', options, target, propertyName);
    return descriptor;
  };
}

/**
 * 페이지네이션 응답 최적화 헬퍼
 */
export class PaginationOptimizer {
  private static readonly logger = new Logger(PaginationOptimizer.name);

  /**
   * 최적화된 페이지네이션 응답 생성
   */
  static optimize<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    options: {
      selectFields?: string[];
      removeFields?: string[];
      baseUrl?: string;
    } = {}
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      links?: {
        first: string;
        prev?: string;
        next?: string;
        last: string;
      };
    };
    meta: {
      count: number;
      performance: {
        optimized: boolean;
        originalSize: number;
        optimizedSize: number;
        reductionPercent: number;
      };
    };
  } {
    const startTime = Date.now();
    const originalSize = Buffer.byteLength(JSON.stringify(items), 'utf8');
    
    let optimizedItems = items;

    // 필드 제거
    if (options.removeFields && options.removeFields.length > 0) {
      optimizedItems = this.removeFieldsFromArray(optimizedItems, options.removeFields);
    }

    // 필드 선택
    if (options.selectFields && options.selectFields.length > 0) {
      optimizedItems = this.selectFieldsFromArray(optimizedItems, options.selectFields);
    }

    const optimizedSize = Buffer.byteLength(JSON.stringify(optimizedItems), 'utf8');
    const reductionPercent = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

    const totalPages = Math.ceil(total / limit);
    
    // 링크 생성 (HATEOAS)
    const links = options.baseUrl ? {
      first: `${options.baseUrl}?page=1&limit=${limit}`,
      ...(page > 1 && {
        prev: `${options.baseUrl}?page=${page - 1}&limit=${limit}`
      }),
      ...(page < totalPages && {
        next: `${options.baseUrl}?page=${page + 1}&limit=${limit}`
      }),
      last: `${options.baseUrl}?page=${totalPages}&limit=${limit}`
    } : undefined;

    const processingTime = Date.now() - startTime;
    
    if (processingTime > 50) {
      this.logger.warn(`Slow pagination optimization: ${processingTime}ms`);
    }

    return {
      data: optimizedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        ...(links && { links })
      },
      meta: {
        count: optimizedItems.length,
        performance: {
          optimized: reductionPercent > 0,
          originalSize,
          optimizedSize,
          reductionPercent
        }
      }
    };
  }

  /**
   * 배열에서 필드 제거
   */
  private static removeFieldsFromArray<T>(items: T[], fieldsToRemove: string[]): T[] {
    return items.map(item => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const cleaned = { ...item } as any;
      
      fieldsToRemove.forEach(field => {
        if (field.includes('.')) {
          const parts = field.split('.');
          let current = cleaned;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] && typeof current[parts[i]] === 'object') {
              current = current[parts[i]];
            } else {
              return;
            }
          }
          
          delete current[parts[parts.length - 1]];
        } else {
          delete cleaned[field];
        }
      });

      return cleaned;
    });
  }

  /**
   * 배열에서 필드 선택
   */
  private static selectFieldsFromArray<T>(items: T[], fields: string[]): T[] {
    return items.map(item => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const selected: any = {};
      
      fields.forEach(field => {
        if (field.includes('.')) {
          const parts = field.split('.');
          let source = item as any;
          let target = selected;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (source[parts[i]]) {
              if (!target[parts[i]]) {
                target[parts[i]] = {};
              }
              source = source[parts[i]];
              target = target[parts[i]];
            } else {
              return;
            }
          }
          
          const lastPart = parts[parts.length - 1];
          if (source[lastPart] !== undefined) {
            target[lastPart] = source[lastPart];
          }
        } else {
          if ((item as any)[field] !== undefined) {
            selected[field] = (item as any)[field];
          }
        }
      });

      return selected;
    }) as T[];
  }
} 