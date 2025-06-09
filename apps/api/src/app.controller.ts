import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * 애플리케이션 기본 컨트롤러
 * 
 * 기본 상태 확인 및 정보 제공 엔드포인트를 처리합니다.
 */
@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * API 서버 상태 확인
   * 
   * @returns 서버 기본 정보 및 상태
   */
  @Get()
  @ApiOperation({ 
    summary: 'API 서버 상태 확인',
    description: '배달 플랫폼 API 서버의 기본 정보와 상태를 반환합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '서버 상태 정보',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '배달 플랫폼 API 서버가 정상 작동 중입니다.' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
        environment: { type: 'string', example: 'development' }
      }
    }
  })
  getAppInfo() {
    return this.appService.getAppInfo();
  }

  /**
   * 서버 헬스 체크
   * 
   * @returns 간단한 상태 메시지
   */
  @Get('health')
  @ApiOperation({ 
    summary: '서버 헬스 체크',
    description: '서버가 정상적으로 작동하는지 확인합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '서버 정상 상태',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        uptime: { type: 'number', example: 3600 }
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
} 