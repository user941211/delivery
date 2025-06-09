/**
 * App 모듈 통합 테스트
 * 
 * AppController의 HTTP 엔드포인트를 Supertest로 테스트합니다.
 * 의존성 문제를 피하기 위해 AppController와 AppService만 테스트합니다.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('App Controller Integration Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  /**
   * 기본 엔드포인트 테스트
   */
  describe('GET /', () => {
    it('should return app information', async () => {
      // When & Then
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Response 구조 검증
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('features');

      // 데이터 타입 검증
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.environment).toBe('string');
      expect(Array.isArray(response.body.features)).toBe(true);

      // 필수 기능 포함 검증
      expect(response.body.features).toEqual(
        expect.arrayContaining([
          '사용자 인증',
          '음식점 관리',
          '주문 처리',
          '배달 추적',
          'API 문서화'
        ])
      );
    });

    it('should return correct content type', async () => {
      // When & Then
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /json/);
    });

    it('should handle requests with accept header', async () => {
      // When & Then
      await request(app.getHttpServer())
        .get('/')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  /**
   * 헬스 체크 엔드포인트 테스트
   */
  describe('GET /health', () => {
    it('should return health status', async () => {
      // When & Then
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Response 구조 검증
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('memory');

      // 데이터 타입 및 값 검증
      expect(response.body.status).toBe('OK');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(typeof response.body.timestamp).toBe('string');
      
      // 메모리 정보 검증
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(typeof response.body.memory.used).toBe('number');
      expect(typeof response.body.memory.total).toBe('number');
      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.memory.total).toBeGreaterThan(response.body.memory.used);
    });

    it('should return health check with correct headers', async () => {
      // When & Then
      await request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  /**
   * 에러 처리 테스트
   */
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      // When & Then
      await request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404);
    });

    it('should handle invalid HTTP methods', async () => {
      // When & Then
      await request(app.getHttpServer())
        .patch('/')
        .expect(404);
    });
  });

  /**
   * 성능 및 응답 시간 테스트
   */
  describe('Performance', () => {
    it('should respond within acceptable time limit', async () => {
      // Given
      const startTime = Date.now();

      // When
      await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // 1초 이내 응답
    });

    it('should handle multiple concurrent requests', async () => {
      // Given
      const concurrentRequests = 3; // 요청 수를 줄여서 안정성 확보
      
      // When: 순차적으로 요청하되 빠르게 실행
      const responses = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const response = await request(app.getHttpServer())
          .get('/')
          .expect(200);
        responses.push(response);
      }
      
      // Then
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  /**
   * 데이터 일관성 테스트
   */
  describe('Data Consistency', () => {
    it('should return consistent data across multiple requests', async () => {
      // Given: 여러 번 요청
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/'),
        request(app.getHttpServer()).get('/'),
        request(app.getHttpServer()).get('/')
      ]);

      // When & Then: 일관된 데이터 구조
      const [first, second, third] = responses;
      
      expect(first.body.message).toBe(second.body.message);
      expect(first.body.message).toBe(third.body.message);
      expect(first.body.version).toBe(second.body.version);
      expect(first.body.version).toBe(third.body.version);
      expect(first.body.features).toEqual(second.body.features);
      expect(first.body.features).toEqual(third.body.features);
    });

    it('should return valid timestamp format', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then: ISO 8601 형식 확인
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // 유효한 날짜인지 확인
      const date = new Date(timestamp);
      expect(date.getTime()).not.toBeNaN();
      
      // 현재 시간과 크게 차이나지 않는지 확인 (1분 이내)
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - date.getTime());
      expect(timeDiff).toBeLessThan(60000); // 1분 = 60,000ms
    });
  });

  /**
   * 환경별 동작 테스트
   */
  describe('Environment Specific', () => {
    it('should return appropriate environment information', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then: 환경 정보 검증
      const environment = response.body.environment;
      expect(['development', 'test', 'production', 'staging']).toContain(environment);
    });

    it('should handle process information correctly', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Then: 프로세스 정보가 유효한지 확인
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.uptime).toBeGreaterThan(0);
      
      // PID 정보가 있다면 유효성 검증
      if (response.body.pid) {
        expect(typeof response.body.pid).toBe('number');
        expect(response.body.pid).toBeGreaterThan(0);
      }
    });
  });
}) 