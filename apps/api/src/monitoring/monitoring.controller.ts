import {
  Controller,
  Get,
  Query,
  UseGuards,
  Header,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 인증 가드 (존재한다고 가정)
// import { RolesGuard } from '../auth/roles.guard'; // 역할 기반 가드
// import { Roles } from '../auth/roles.decorator'; // 역할 데코레이터

/**
 * 모니터링 컨트롤러
 * 시스템 상태, 메트릭, 헬스 체크 등의 모니터링 API를 제공
 */
@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 시스템 헬스 체크 - 공개 엔드포인트
   * 로드 밸런서나 모니터링 도구에서 사용
   */
  @Get('health')
  @ApiOperation({ 
    summary: '시스템 헬스 체크',
    description: '시스템의 전반적인 상태를 확인합니다. 로드 밸런서나 모니터링 도구에서 사용됩니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '시스템이 정상 작동 중입니다.',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2024-12-01T10:30:00Z',
        checks: {
          database: { status: 'healthy', responseTime: 15 },
          system: { status: 'healthy', memory: { percentage: 45.2 } },
          api: { status: 'healthy', uptime: 3600 }
        },
        uptime: 3600,
        version: '1.0.0'
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: '시스템에 문제가 발생했습니다.',
    schema: {
      example: {
        status: 'unhealthy',
        timestamp: '2024-12-01T10:30:00Z',
        error: 'Database connection failed',
        uptime: 3600
      }
    }
  })
  async getHealthCheck() {
    try {
      const health = await this.monitoringService.getHealthCheck();
      
      // 상태에 따라 HTTP 상태 코드 설정
      if (health.status === 'unhealthy') {
        throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      return health;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed'
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 간단한 헬스 체크 - 핑 응답
   */
  @Get('ping')
  @ApiOperation({ 
    summary: '간단한 생존 확인',
    description: '서버가 응답하는지 간단히 확인합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '서버가 응답합니다.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-12-01T10:30:00Z',
        message: 'pong'
      }
    }
  })
  getPing() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'pong'
    };
  }

  /**
   * 상세 시스템 메트릭 조회 - 관리자 전용
   */
  @Get('metrics')
  @ApiOperation({ 
    summary: '상세 시스템 메트릭 조회',
    description: '시스템의 상세한 성능 메트릭을 조회합니다. 관리자 권한이 필요합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '시스템 메트릭이 성공적으로 조회되었습니다.' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '인증이 필요합니다.' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '관리자 권한이 필요합니다.' 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard) // 인증 및 권한 검사
  // @Roles('admin') // 관리자만 접근 가능
  async getMetrics() {
    try {
      return await this.monitoringService.getDetailedMetrics();
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to collect metrics',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Prometheus 형식 메트릭 조회
   */
  @Get('metrics/prometheus')
  @ApiOperation({ 
    summary: 'Prometheus 형식 메트릭',
    description: 'Prometheus 모니터링 시스템에서 사용할 수 있는 형식의 메트릭을 제공합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prometheus 메트릭이 성공적으로 조회되었습니다.',
    headers: {
      'Content-Type': {
        description: 'Content type',
        schema: { type: 'string', example: 'text/plain; version=0.0.4; charset=utf-8' }
      }
    }
  })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getPrometheusMetrics() {
    try {
      return await this.monitoringService.getPrometheusMetrics();
    } catch (error) {
      throw new HttpException(
        'Failed to generate Prometheus metrics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 데이터베이스 연결 상태 체크
   */
  @Get('database')
  @ApiOperation({ 
    summary: '데이터베이스 상태 체크',
    description: '데이터베이스 연결 상태와 응답 시간을 확인합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '데이터베이스 상태가 성공적으로 조회되었습니다.' 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard) // 인증 및 권한 검사
  // @Roles('admin') // 관리자만 접근 가능
  async getDatabaseHealth() {
    try {
      return await this.monitoringService.checkDatabaseHealth();
    } catch (error) {
      throw new HttpException(
        {
          error: 'Database health check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 시스템 리소스 상태 체크
   */
  @Get('system')
  @ApiOperation({ 
    summary: '시스템 리소스 상태',
    description: 'CPU, 메모리 등 시스템 리소스 상태를 확인합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '시스템 상태가 성공적으로 조회되었습니다.' 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard) // 인증 및 권한 검사
  // @Roles('admin') // 관리자만 접근 가능
  getSystemHealth() {
    try {
      return this.monitoringService.getSystemHealth();
    } catch (error) {
      throw new HttpException(
        {
          error: 'System health check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 로그 통계 조회
   */
  @Get('logs/stats')
  @ApiOperation({ 
    summary: '로그 통계 조회',
    description: '지정된 시간 동안의 로그 레벨별 통계를 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '로그 통계가 성공적으로 조회되었습니다.' 
  })
  @ApiQuery({ 
    name: 'hours', 
    required: false, 
    description: '조회할 시간 범위 (시간 단위)', 
    example: 24 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard) // 인증 및 권한 검사
  // @Roles('admin') // 관리자만 접근 가능
  async getLogStatistics(@Query('hours') hours?: string) {
    try {
      const hoursNumber = hours ? parseInt(hours, 10) : 24;
      
      if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 168) { // 최대 1주일
        throw new HttpException(
          'Invalid hours parameter. Must be between 1 and 168.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.monitoringService.getLogStatistics(hoursNumber);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Failed to get log statistics',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 서버 정보 조회
   */
  @Get('info')
  @ApiOperation({ 
    summary: '서버 정보 조회',
    description: '서버의 기본 정보와 버전을 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '서버 정보가 성공적으로 조회되었습니다.',
    schema: {
      example: {
        name: 'Delivery Platform API',
        version: '1.0.0',
        environment: 'production',
        nodeVersion: 'v18.17.0',
        platform: 'linux',
        architecture: 'x64',
        timezone: 'Asia/Seoul',
        startTime: '2024-12-01T09:00:00Z',
        uptime: 3600
      }
    }
  })
  getServerInfo() {
    return {
      name: 'Delivery Platform API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      uptime: Math.floor(process.uptime())
    };
  }
} 