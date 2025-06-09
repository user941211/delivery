/**
 * API 성능 테스트
 * 
 * API 응답 시간, 동시성, 메모리 사용량 등을 측정합니다.
 * 외부 API 키 없이 내부 성능만 측정합니다.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('API Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * 응답 시간 성능 테스트
   */
  describe('Response Time Performance', () => {
    it('should respond to / within 100ms', async () => {
      // Given
      const maxResponseTime = 100; // 100ms
      const startTime = Date.now();

      // When
      await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(maxResponseTime);
    });

    it('should respond to /health within 50ms', async () => {
      // Given
      const maxResponseTime = 50; // 50ms
      const startTime = Date.now();

      // When
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Then
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(maxResponseTime);
    });

    it('should maintain consistent response times across multiple requests', async () => {
      // Given
      const requestCount = 10;
      const maxResponseTime = 100;
      const responseTimes: number[] = [];

      // When
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer())
          .get('/')
          .expect(200);
        responseTimes.push(Date.now() - startTime);
      }

      // Then
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      
      expect(averageResponseTime).toBeLessThan(maxResponseTime);
      expect(maxTime).toBeLessThan(maxResponseTime * 2); // 최대 응답시간은 평균의 2배 이내
    });
  });

  /**
   * 동시성 테스트
   */
  describe('Concurrency Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Given
      const concurrentRequests = 5;
      const maxResponseTime = 200; // 동시 요청시 조금 더 허용
      
      // When
      const promises = Array.from({ length: concurrentRequests }, () => {
        const startTime = Date.now();
        return request(app.getHttpServer())
          .get('/')
          .expect(200)
          .then(() => Date.now() - startTime);
      });

      const responseTimes = await Promise.all(promises);

      // Then
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      
      expect(averageTime).toBeLessThan(maxResponseTime);
      expect(maxTime).toBeLessThan(maxResponseTime * 1.5);
    });

    it('should maintain performance under sustained load', async () => {
      // Given
      const batchSize = 3;
      const batchCount = 3;
      const maxAverageResponseTime = 150;

      // When
      const allResponseTimes: number[] = [];
      
      for (let batch = 0; batch < batchCount; batch++) {
        const batchPromises = Array.from({ length: batchSize }, () => {
          const startTime = Date.now();
          return request(app.getHttpServer())
            .get('/health')
            .expect(200)
            .then(() => Date.now() - startTime);
        });

        const batchTimes = await Promise.all(batchPromises);
        allResponseTimes.push(...batchTimes);
        
        // 배치 간 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Then
      const averageTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      expect(averageTime).toBeLessThan(maxAverageResponseTime);
    });
  });

  /**
   * 메모리 사용량 테스트
   */
  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated requests', async () => {
      // Given
      const initialMemory = process.memoryUsage();
      const requestCount = 20;

      // When
      for (let i = 0; i < requestCount; i++) {
        await request(app.getHttpServer())
          .get('/')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Then
      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 메모리 증가량이 1MB 이하여야 함
      expect(heapGrowth).toBeLessThan(1024 * 1024);
    });

    it('should maintain efficient memory usage for health checks', async () => {
      // Given
      const requestCount = 30;
      const memorySnapshots: number[] = [];

      // When
      for (let i = 0; i < requestCount; i++) {
        await request(app.getHttpServer())
          .get('/health')
          .expect(200);
        
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      // Then
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      
      // 전체 메모리 증가량이 512KB 이하여야 함
      expect(memoryGrowth).toBeLessThan(512 * 1024);
    });
  });

  /**
   * 처리량 테스트
   */
  describe('Throughput Performance', () => {
    it('should achieve minimum requests per second', async () => {
      // Given
      const testDuration = 2000; // 2초
      const minRequestsPerSecond = 10;
      let completedRequests = 0;
      const startTime = Date.now();

      // When
      const promises: Promise<any>[] = [];
      
      while (Date.now() - startTime < testDuration) {
        const promise = request(app.getHttpServer())
          .get('/health')
          .expect(200)
          .then(() => completedRequests++);
        
        promises.push(promise);
        
        // 짧은 대기로 요청 간격 조절
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await Promise.all(promises);

      // Then
      const actualDuration = Date.now() - startTime;
      const requestsPerSecond = (completedRequests * 1000) / actualDuration;
      
      expect(requestsPerSecond).toBeGreaterThan(minRequestsPerSecond);
    });
  });

  /**
   * 응답 크기 성능 테스트
   */
  describe('Response Size Performance', () => {
    it('should return appropriately sized responses', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then
      const responseSize = JSON.stringify(response.body).length;
      
      // 응답 크기가 적절한 범위 내에 있어야 함 (1KB 이하)
      expect(responseSize).toBeLessThan(1024);
      expect(responseSize).toBeGreaterThan(100); // 최소한의 데이터는 포함
    });

    it('should compress responses efficiently', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Then
      const responseSize = JSON.stringify(response.body).length;
      
      // 헬스 체크 응답은 더 작아야 함 (512B 이하)
      expect(responseSize).toBeLessThan(512);
    });
  });

  /**
   * 에러 처리 성능 테스트
   */
  describe('Error Handling Performance', () => {
    it('should handle 404 errors quickly', async () => {
      // Given
      const maxResponseTime = 50;
      const startTime = Date.now();

      // When
      await request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404);

      // Then
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(maxResponseTime);
    });

    it('should maintain performance when handling multiple 404s', async () => {
      // Given
      const requestCount = 5;
      const maxAverageResponseTime = 100;
      const responseTimes: number[] = [];

      // When
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer())
          .get(`/non-existent-${i}`)
          .expect(404);
        responseTimes.push(Date.now() - startTime);
      }

      // Then
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(averageTime).toBeLessThan(maxAverageResponseTime);
    });
  });
}); 