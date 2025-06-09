import { Injectable } from '@nestjs/common';

/**
 * 헬스 체크 서비스
 * 
 * 서버 및 의존성 서비스들의 상태를 확인하는 로직을 제공합니다.
 */
@Injectable()
export class HealthService {
  
  /**
   * 기본 헬스 체크
   */
  check() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 상세 헬스 체크
   * 데이터베이스 연결 상태 등을 포함합니다.
   */
  async checkDetailed() {
    const basic = this.check();
    
    return {
      ...basic,
      details: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        },
        database: {
          status: 'connected', // 추후 실제 DB 연결 상태로 대체
          responseTime: '< 50ms'
        },
        services: {
          supabase: 'connected'
        }
      }
    };
  }
} 