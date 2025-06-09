import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

/**
 * AppService 단위 테스트
 * 
 * 기본 서비스 메서드들의 정상 동작을 검증합니다.
 */
describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  /**
   * 서비스 인스턴스가 정상적으로 생성되는지 확인
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * getAppInfo 메서드 테스트
   */
  describe('getAppInfo', () => {
    it('should return app information with correct structure', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('features');
      
      expect(typeof result.message).toBe('string');
      expect(typeof result.version).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.environment).toBe('string');
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should return expected message', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      expect(result.message).toBe('배달 플랫폼 API 서버가 정상 작동 중입니다.');
    });

    it('should return version 1.0.0', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      expect(result.version).toBe('1.0.0');
    });

    it('should return valid ISO timestamp', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return environment from NODE_ENV or default to development', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      const expectedEnv = process.env.NODE_ENV || 'development';
      expect(result.environment).toBe(expectedEnv);
    });

    it('should return features array with expected items', () => {
      // Given & When
      const result = service.getAppInfo();

      // Then
      const expectedFeatures = [
        '사용자 인증',
        '음식점 관리',
        '주문 처리',
        '배달 추적',
        'API 문서화'
      ];
      
      expect(result.features).toEqual(expectedFeatures);
      expect(result.features).toHaveLength(5);
    });
  });

  /**
   * getHealth 메서드 테스트
   */
  describe('getHealth', () => {
    it('should return health information with correct structure', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('pid');
      
      expect(typeof result.status).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.memory).toBe('object');
      expect(typeof result.pid).toBe('number');
    });

    it('should return OK status', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(result.status).toBe('OK');
    });

    it('should return valid uptime', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.uptime)).toBe(true);
    });

    it('should return valid ISO timestamp', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return memory information with used and total', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThan(0);
      expect(result.memory.used).toBeLessThanOrEqual(result.memory.total);
    });

    it('should return valid process ID', () => {
      // Given & When
      const result = service.getHealth();

      // Then
      expect(result.pid).toBe(process.pid);
      expect(Number.isInteger(result.pid)).toBe(true);
      expect(result.pid).toBeGreaterThan(0);
    });

    it('should return consistent data types across multiple calls', () => {
      // Given & When
      const result1 = service.getHealth();
      const result2 = service.getHealth();

      // Then
      expect(typeof result1.status).toBe(typeof result2.status);
      expect(typeof result1.uptime).toBe(typeof result2.uptime);
      expect(typeof result1.memory.used).toBe(typeof result2.memory.used);
      expect(result1.pid).toBe(result2.pid);
    });
  });
}); 