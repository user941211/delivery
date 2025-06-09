import { Injectable } from '@nestjs/common';

/**
 * 애플리케이션 기본 서비스
 * 
 * 서버 상태 정보 및 헬스 체크 로직을 제공합니다.
 */
@Injectable()
export class AppService {
  
  /**
   * 애플리케이션 기본 정보 반환
   * 
   * @returns 서버 정보 객체
   */
  getAppInfo() {
    return {
      message: '배달 플랫폼 API 서버가 정상 작동 중입니다.',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      features: [
        '사용자 인증',
        '음식점 관리',
        '주문 처리',
        '배달 추적',
        'API 문서화'
      ]
    };
  }

  /**
   * 서버 헬스 체크
   * 
   * @returns 서버 상태 정보
   */
  getHealth() {
    return {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      },
      pid: process.pid
    };
  }
} 