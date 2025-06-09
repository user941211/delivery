import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * AppController 단위 테스트
 * 
 * 컨트롤러의 엔드포인트 동작을 검증합니다.
 * AppService는 모킹하여 컨트롤러 로직만 테스트합니다.
 */
describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  // 모킹된 서비스 응답 데이터
  const mockAppInfo = {
    message: '배달 플랫폼 API 서버가 정상 작동 중입니다.',
    version: '1.0.0',
    timestamp: '2024-01-15T10:30:00.000Z',
    environment: 'test',
    features: [
      '사용자 인증',
      '음식점 관리',
      '주문 처리',
      '배달 추적',
      'API 문서화'
    ]
  };

  const mockHealthInfo = {
    status: 'OK',
    uptime: 3600,
    timestamp: '2024-01-15T10:30:00.000Z',
    memory: {
      used: 50.25,
      total: 100.50
    },
    pid: 12345
  };

  beforeEach(async () => {
    // AppService 모킹
    const mockAppService = {
      getAppInfo: jest.fn().mockReturnValue(mockAppInfo),
      getHealth: jest.fn().mockReturnValue(mockHealthInfo),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  /**
   * 컨트롤러 인스턴스가 정상적으로 생성되는지 확인
   */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * getAppInfo 엔드포인트 테스트
   */
  describe('GET /', () => {
    it('should return app information', () => {
      // Given & When
      const result = controller.getAppInfo();

      // Then
      expect(result).toEqual(mockAppInfo);
      expect(appService.getAppInfo).toHaveBeenCalled();
      expect(appService.getAppInfo).toHaveBeenCalledTimes(1);
    });

    it('should call AppService.getAppInfo method', () => {
      // Given & When
      controller.getAppInfo();

      // Then
      expect(appService.getAppInfo).toHaveBeenCalled();
    });

    it('should return expected data structure', () => {
      // Given & When
      const result = controller.getAppInfo();

      // Then
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('features');
    });

    it('should return message as string', () => {
      // Given & When
      const result = controller.getAppInfo();

      // Then
      expect(typeof result.message).toBe('string');
      expect(result.message).toBe('배달 플랫폼 API 서버가 정상 작동 중입니다.');
    });

    it('should return version as string', () => {
      // Given & When
      const result = controller.getAppInfo();

      // Then
      expect(typeof result.version).toBe('string');
      expect(result.version).toBe('1.0.0');
    });

    it('should return features as array', () => {
      // Given & When
      const result = controller.getAppInfo();

      // Then
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features).toHaveLength(5);
    });
  });

  /**
   * getHealth 엔드포인트 테스트
   */
  describe('GET /health', () => {
    it('should return health information', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(result).toEqual(mockHealthInfo);
      expect(appService.getHealth).toHaveBeenCalled();
      expect(appService.getHealth).toHaveBeenCalledTimes(1);
    });

    it('should call AppService.getHealth method', () => {
      // Given & When
      controller.getHealth();

      // Then
      expect(appService.getHealth).toHaveBeenCalled();
    });

    it('should return expected data structure', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('pid');
    });

    it('should return status as OK', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(result.status).toBe('OK');
    });

    it('should return uptime as number', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory information', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
    });

    it('should return valid process ID', () => {
      // Given & When
      const result = controller.getHealth();

      // Then
      expect(typeof result.pid).toBe('number');
      expect(Number.isInteger(result.pid)).toBe(true);
    });
  });

  /**
   * 의존성 주입 테스트
   */
  describe('Dependency Injection', () => {
    it('should inject AppService correctly', () => {
      expect(appService).toBeDefined();
      expect(appService.getAppInfo).toBeDefined();
      expect(appService.getHealth).toBeDefined();
    });
  });

  /**
   * 에러 핸들링 테스트
   */
  describe('Error Handling', () => {
    it('should handle AppService.getAppInfo throwing an error', () => {
      // Given
      const errorMessage = 'Service error';
      jest.spyOn(appService, 'getAppInfo').mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then
      expect(() => controller.getAppInfo()).toThrow(errorMessage);
    });

    it('should handle AppService.getHealth throwing an error', () => {
      // Given
      const errorMessage = 'Health check failed';
      jest.spyOn(appService, 'getHealth').mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // When & Then
      expect(() => controller.getHealth()).toThrow(errorMessage);
    });
  });
}); 