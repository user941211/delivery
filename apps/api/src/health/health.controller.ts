import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * 헬스 체크 컨트롤러
 * 
 * 서버 상태 및 의존성 서비스 상태를 확인하는 엔드포인트를 제공합니다.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 기본 헬스 체크
   */
  @Get()
  @ApiOperation({ 
    summary: '기본 헬스 체크',
    description: '서버의 기본 상태를 확인합니다.'
  })
  @ApiResponse({ status: 200, description: '서버 정상 상태' })
  check() {
    return this.healthService.check();
  }

  /**
   * 상세 헬스 체크 (데이터베이스 연결 포함)
   */
  @Get('detailed')
  @ApiOperation({ 
    summary: '상세 헬스 체크',
    description: '서버 및 데이터베이스 연결 상태를 확인합니다.'
  })
  @ApiResponse({ status: 200, description: '상세 상태 정보' })
  async checkDetailed() {
    return this.healthService.checkDetailed();
  }
} 