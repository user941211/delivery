/**
 * 캐시 관리 컨트롤러
 * 
 * 캐시 상태 모니터링 및 관리를 위한 관리자 전용 API를 제공합니다.
 */

import { Controller, Get, Post, Delete, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CacheService, CacheKeyType, InvalidationPattern } from '../services/cache.service';

/**
 * 캐시 무효화 요청 DTO
 */
export class CacheInvalidationDto {
  pattern: string;
  type: InvalidationPattern;
  tags?: string[];
}

/**
 * 캐시 설정 요청 DTO
 */
export class CacheSetDto {
  keyType: CacheKeyType;
  key: string;
  value: any;
  ttl?: number;
  tags?: string[];
}

@ApiTags('캐시 관리')
@Controller('admin/cache')
@ApiBearerAuth()
// @UseGuards(AdminGuard) // 실제 환경에서는 관리자 권한 검증 필요
export class CacheManagementController {
  private readonly logger = new Logger(CacheManagementController.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 캐시 통계 조회
   */
  @Get('stats')
  @ApiOperation({ 
    summary: '캐시 통계 조회',
    description: '전체 캐시 시스템의 성능 통계를 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '캐시 통계 정보',
    schema: {
      type: 'object',
      properties: {
        hits: { type: 'number', description: '캐시 히트 수' },
        misses: { type: 'number', description: '캐시 미스 수' },
        hitRate: { type: 'number', description: '캐시 히트율 (%)' },
        totalKeys: { type: 'number', description: '총 캐시 키 수' },
        memoryUsage: { type: 'number', description: '메모리 사용량 (bytes)' },
        operationsPerSecond: { type: 'number', description: '초당 캐시 작업 수' }
      }
    }
  })
  async getCacheStats() {
    try {
      const stats = await this.cacheService.getStats();
      this.logger.log('Cache stats retrieved');
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error);
      return {
        success: false,
        error: 'Failed to retrieve cache statistics',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 특정 캐시 조회
   */
  @Get(':keyType/:key')
  @ApiOperation({ 
    summary: '특정 캐시 조회',
    description: '지정된 키 타입과 키로 캐시된 데이터를 조회합니다.'
  })
  @ApiParam({ name: 'keyType', description: '캐시 키 타입', enum: CacheKeyType })
  @ApiParam({ name: 'key', description: '캐시 키' })
  @ApiResponse({ status: 200, description: '캐시된 데이터' })
  @ApiResponse({ status: 404, description: '캐시 데이터 없음' })
  async getCacheValue(
    @Param('keyType') keyType: CacheKeyType,
    @Param('key') key: string
  ) {
    try {
      const value = await this.cacheService.get(keyType, key);
      
      if (value === null) {
        return {
          success: false,
          message: 'Cache not found',
          keyType,
          key,
          timestamp: new Date().toISOString()
        };
      }

      this.logger.log(`Cache retrieved: ${keyType}:${key}`);
      
      return {
        success: true,
        data: value,
        keyType,
        key,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get cache ${keyType}:${key}`, error);
      return {
        success: false,
        error: 'Failed to retrieve cache value',
        keyType,
        key,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 캐시 데이터 설정
   */
  @Post('set')
  @ApiOperation({ 
    summary: '캐시 데이터 설정',
    description: '새로운 캐시 데이터를 저장합니다.'
  })
  @ApiBody({ type: CacheSetDto })
  @ApiResponse({ status: 201, description: '캐시 저장 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async setCacheValue(@Body() cacheSetDto: CacheSetDto) {
    try {
      const success = await this.cacheService.set(
        cacheSetDto.keyType,
        cacheSetDto.key,
        cacheSetDto.value,
        {
          ttl: cacheSetDto.ttl,
          tags: cacheSetDto.tags
        }
      );

      if (success) {
        this.logger.log(`Cache set: ${cacheSetDto.keyType}:${cacheSetDto.key}`);
        return {
          success: true,
          message: 'Cache value set successfully',
          keyType: cacheSetDto.keyType,
          key: cacheSetDto.key,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'Failed to set cache value',
          keyType: cacheSetDto.keyType,
          key: cacheSetDto.key,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logger.error(`Failed to set cache ${cacheSetDto.keyType}:${cacheSetDto.key}`, error);
      return {
        success: false,
        error: 'Failed to set cache value',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 특정 캐시 삭제
   */
  @Delete(':keyType/:key')
  @ApiOperation({ 
    summary: '특정 캐시 삭제',
    description: '지정된 키 타입과 키의 캐시를 삭제합니다.'
  })
  @ApiParam({ name: 'keyType', description: '캐시 키 타입', enum: CacheKeyType })
  @ApiParam({ name: 'key', description: '캐시 키' })
  @ApiResponse({ status: 200, description: '캐시 삭제 성공' })
  async deleteCacheValue(
    @Param('keyType') keyType: CacheKeyType,
    @Param('key') key: string
  ) {
    try {
      const success = await this.cacheService.delete(keyType, key);
      
      if (success) {
        this.logger.log(`Cache deleted: ${keyType}:${key}`);
        return {
          success: true,
          message: 'Cache value deleted successfully',
          keyType,
          key,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete cache value',
          keyType,
          key,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache ${keyType}:${key}`, error);
      return {
        success: false,
        error: 'Failed to delete cache value',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  @Post('invalidate')
  @ApiOperation({ 
    summary: '패턴 기반 캐시 무효화',
    description: '패턴 또는 태그를 사용하여 여러 캐시를 한 번에 무효화합니다.'
  })
  @ApiBody({ type: CacheInvalidationDto })
  @ApiResponse({ status: 200, description: '캐시 무효화 성공' })
  async invalidateCache(@Body() invalidationDto: CacheInvalidationDto) {
    try {
      let invalidatedCount = 0;

      if (invalidationDto.tags && invalidationDto.tags.length > 0) {
        // 태그 기반 무효화
        invalidatedCount = await this.cacheService.invalidateByTags(invalidationDto.tags);
        this.logger.log(`Cache invalidated by tags: ${invalidationDto.tags.join(', ')} (${invalidatedCount} keys)`);
      } else {
        // 패턴 기반 무효화
        invalidatedCount = await this.cacheService.invalidate(
          invalidationDto.pattern,
          invalidationDto.type
        );
        this.logger.log(`Cache invalidated by pattern: ${invalidationDto.pattern} (${invalidatedCount} keys)`);
      }

      return {
        success: true,
        message: `Successfully invalidated ${invalidatedCount} cache entries`,
        invalidatedCount,
        pattern: invalidationDto.pattern,
        type: invalidationDto.type,
        tags: invalidationDto.tags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to invalidate cache', error);
      return {
        success: false,
        error: 'Failed to invalidate cache',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 레스토랑 캐시 무효화
   */
  @Post('invalidate/restaurant/:restaurantId')
  @ApiOperation({ 
    summary: '레스토랑 캐시 무효화',
    description: '특정 레스토랑의 모든 캐시를 무효화합니다.'
  })
  @ApiParam({ name: 'restaurantId', description: '레스토랑 ID' })
  @ApiResponse({ status: 200, description: '레스토랑 캐시 무효화 성공' })
  async invalidateRestaurantCache(@Param('restaurantId') restaurantId: string) {
    try {
      const invalidatedCount = await this.cacheService.invalidateByTags([`restaurant_${restaurantId}`]);
      
      this.logger.log(`Restaurant cache invalidated: ${restaurantId} (${invalidatedCount} keys)`);
      
      return {
        success: true,
        message: `Successfully invalidated ${invalidatedCount} cache entries for restaurant ${restaurantId}`,
        restaurantId,
        invalidatedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to invalidate restaurant cache: ${restaurantId}`, error);
      return {
        success: false,
        error: 'Failed to invalidate restaurant cache',
        restaurantId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 모든 캐시 무효화 (위험한 작업)
   */
  @Post('invalidate/all')
  @ApiOperation({ 
    summary: '모든 캐시 무효화',
    description: '⚠️ 위험: 모든 캐시를 삭제합니다. 성능에 큰 영향을 줄 수 있습니다.'
  })
  @ApiResponse({ status: 200, description: '모든 캐시 무효화 성공' })
  async invalidateAllCache() {
    try {
      const invalidatedCount = await this.cacheService.invalidate('*', InvalidationPattern.PATTERN);
      
      this.logger.warn(`All cache invalidated (${invalidatedCount} keys) - This may impact performance`);
      
      return {
        success: true,
        message: `Successfully invalidated all ${invalidatedCount} cache entries`,
        warning: 'This operation may impact system performance temporarily',
        invalidatedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to invalidate all cache', error);
      return {
        success: false,
        error: 'Failed to invalidate all cache',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 캐시 워밍업 (인기 데이터 미리 로딩)
   */
  @Post('warmup/:keyType')
  @ApiOperation({ 
    summary: '캐시 워밍업',
    description: '지정된 키 타입의 인기 데이터를 미리 캐시에 로딩합니다.'
  })
  @ApiParam({ name: 'keyType', description: '캐시 키 타입', enum: CacheKeyType })
  @ApiResponse({ status: 200, description: '캐시 워밍업 성공' })
  async warmupCache(@Param('keyType') keyType: CacheKeyType) {
    try {
      // 실제 환경에서는 각 keyType에 맞는 데이터 로더 구현 필요
      await this.cacheService.warmup(keyType, async () => {
        // 데모용 데이터 로더
        return { message: `Warmup data for ${keyType}`, timestamp: new Date() };
      });

      this.logger.log(`Cache warmup completed for: ${keyType}`);
      
      return {
        success: true,
        message: `Cache warmup completed for ${keyType}`,
        keyType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to warmup cache for ${keyType}`, error);
      return {
        success: false,
        error: `Failed to warmup cache for ${keyType}`,
        keyType,
        timestamp: new Date().toISOString()
      };
    }
  }
} 