import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService, JwtPayload, TokenResponse } from './token.service';

/**
 * TokenService 단위 테스트
 * 
 * JWT 토큰 생성, 검증, 갱신 로직을 검증합니다.
 * JwtService와 ConfigService는 모킹하여 토큰 로직만 테스트합니다.
 */
describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  // 모킹된 JWT 토큰들
  const mockAccessToken = 'mock.access.token';
  const mockRefreshToken = 'mock.refresh.token';
  
  // 모킹된 JWT 페이로드
  const mockPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'customer',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15분 후
  };

  // 모킹된 설정값들
  const mockConfig = {
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  };

  beforeEach(async () => {
    // JwtService 모킹
    const mockJwtService = {
      sign: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    // ConfigService 모킹
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        return mockConfig[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 서비스 인스턴스 생성 테스트
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * 설정 검증 테스트
   */
  describe('Constructor', () => {
    it('should throw error when JWT_SECRET is missing', async () => {
      const invalidConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'JWT_SECRET') return null;
          return mockConfig[key] || defaultValue;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            TokenService,
            { provide: JwtService, useValue: {} },
            { provide: ConfigService, useValue: invalidConfigService },
          ],
        }).compile()
      ).rejects.toThrow('JWT secrets are not configured');
    });

    it('should throw error when REFRESH_TOKEN_SECRET is missing', async () => {
      const invalidConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'REFRESH_TOKEN_SECRET') return null;
          return mockConfig[key] || defaultValue;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            TokenService,
            { provide: JwtService, useValue: {} },
            { provide: ConfigService, useValue: invalidConfigService },
          ],
        }).compile()
      ).rejects.toThrow('JWT secrets are not configured');
    });

    it('should use default values for JWT_EXPIRES_IN', async () => {
      const configWithoutExpiry = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          if (key === 'JWT_EXPIRES_IN') return defaultValue;
          return mockConfig[key] || defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          { provide: JwtService, useValue: {} },
          { provide: ConfigService, useValue: configWithoutExpiry },
        ],
      }).compile();

      const tokenService = module.get<TokenService>(TokenService);
      expect(tokenService).toBeDefined();
      expect(configWithoutExpiry.get).toHaveBeenCalledWith('JWT_EXPIRES_IN', '15m');
    });
  });

  /**
   * 액세스 토큰 생성 테스트
   */
  describe('generateAccessToken', () => {
    it('should generate access token with correct parameters', () => {
      // Given
      (jwtService.sign as jest.Mock).mockReturnValue(mockAccessToken);

      // When
      const result = service.generateAccessToken(mockPayload);

      // Then
      expect(result).toBe(mockAccessToken);
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        secret: mockConfig.JWT_SECRET,
        expiresIn: mockConfig.JWT_EXPIRES_IN,
      });
    });
  });

  /**
   * 리프레시 토큰 생성 테스트
   */
  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct parameters', () => {
      // Given
      (jwtService.sign as jest.Mock).mockReturnValue(mockRefreshToken);

      // When
      const result = service.generateRefreshToken(mockPayload);

      // Then
      expect(result).toBe(mockRefreshToken);
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        secret: mockConfig.REFRESH_TOKEN_SECRET,
        expiresIn: mockConfig.REFRESH_TOKEN_EXPIRES_IN,
      });
    });
  });

  /**
   * 토큰 쌍 생성 테스트
   */
  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      // Given
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'customer' as const;

      // When
      const result = service.generateTokens(userId, email, role);

      // Then
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 900, // 15분 = 900초
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        sub: userId,
        email,
        role,
      }, {
        secret: mockConfig.JWT_SECRET,
        expiresIn: mockConfig.JWT_EXPIRES_IN,
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(2, {
        sub: userId,
        email,
        role,
      }, {
        secret: mockConfig.REFRESH_TOKEN_SECRET,
        expiresIn: mockConfig.REFRESH_TOKEN_EXPIRES_IN,
      });
    });

    it('should calculate correct expiration time for different time units', () => {
      // Test different time units
      const testCases = [
        { expiresIn: '30s', expected: 30 },
        { expiresIn: '5m', expected: 300 },
        { expiresIn: '2h', expected: 7200 },
        { expiresIn: '1d', expected: 86400 },
      ];

      testCases.forEach(({ expiresIn, expected }) => {
        // Given
        const customConfig = { ...mockConfig, JWT_EXPIRES_IN: expiresIn };
        (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
          return customConfig[key] || defaultValue;
        });

        // Create new service instance with custom config
        const customService = new (TokenService as any)(jwtService, configService);
        (jwtService.sign as jest.Mock).mockReturnValue('token');

        // When
        const result = customService.generateTokens('user', 'email@test.com', 'customer');

        // Then
        expect(result.expiresIn).toBe(expected);
      });
    });
  });

  /**
   * 액세스 토큰 검증 테스트
   */
  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      // When
      const result = await service.verifyAccessToken(mockAccessToken);

      // Then
      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockAccessToken, {
        secret: mockConfig.JWT_SECRET,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // When & Then
      await expect(service.verifyAccessToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid access token')
      );
    });
  });

  /**
   * 리프레시 토큰 검증 테스트
   */
  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      // When
      const result = await service.verifyRefreshToken(mockRefreshToken);

      // Then
      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockRefreshToken, {
        secret: mockConfig.REFRESH_TOKEN_SECRET,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // When & Then
      await expect(service.verifyRefreshToken('invalid-refresh-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );
    });
  });

  /**
   * 토큰 갱신 테스트
   */
  describe('refreshAccessToken', () => {
    it('should refresh access token using valid refresh token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      // When
      const result = await service.refreshAccessToken(mockRefreshToken);

      // Then
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockRefreshToken, {
        secret: mockConfig.REFRESH_TOKEN_SECRET,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Given
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // When & Then
      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );
    });
  });

  /**
   * 페이로드 추출 테스트
   */
  describe('extractPayload', () => {
    it('should extract payload from valid token', () => {
      // Given
      (jwtService.decode as jest.Mock).mockReturnValue(mockPayload);

      // When
      const result = service.extractPayload(mockAccessToken);

      // Then
      expect(result).toEqual(mockPayload);
      expect(jwtService.decode).toHaveBeenCalledWith(mockAccessToken);
    });

    it('should return null for invalid token', () => {
      // Given
      (jwtService.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // When
      const result = service.extractPayload('invalid-token');

      // Then
      expect(result).toBeNull();
    });
  });

  /**
   * 만료 시간 파싱 테스트 (private 메서드 간접 테스트)
   */
  describe('parseExpirationTime (Indirect Testing)', () => {
    it('should parse different time units correctly', async () => {
      const testCases = [
        { expiresIn: '30s', expected: 30 },
        { expiresIn: '5m', expected: 300 },
        { expiresIn: '2h', expected: 7200 },
        { expiresIn: '1d', expected: 86400 },
      ];

      for (const { expiresIn, expected } of testCases) {
        // Given: 새로운 설정으로 서비스 생성
        const customConfigService = {
          get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
            const customConfig = { ...mockConfig, JWT_EXPIRES_IN: expiresIn };
            return customConfig[key] || defaultValue;
          }),
        };

        const customJwtService = {
          sign: jest.fn().mockReturnValue('token'),
          verifyAsync: jest.fn(),
          decode: jest.fn(),
        };

        const module = await Test.createTestingModule({
          providers: [
            TokenService,
            { provide: JwtService, useValue: customJwtService },
            { provide: ConfigService, useValue: customConfigService },
          ],
        }).compile();

        const customService = module.get<TokenService>(TokenService);

        // When
        const result = customService.generateTokens('user', 'email@test.com', 'customer');

        // Then
        expect(result.expiresIn).toBe(expected);
      }
    });

    it('should return default value for invalid expiration format', async () => {
      // Given: 잘못된 형식의 만료 시간
      const customConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
          const customConfig = { ...mockConfig, JWT_EXPIRES_IN: 'invalid' };
          return customConfig[key] || defaultValue;
        }),
      };

      const customJwtService = {
        sign: jest.fn().mockReturnValue('token'),
        verifyAsync: jest.fn(),
        decode: jest.fn(),
      };

      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          { provide: JwtService, useValue: customJwtService },
          { provide: ConfigService, useValue: customConfigService },
        ],
      }).compile();

      const customService = module.get<TokenService>(TokenService);

      // When
      const result = customService.generateTokens('user', 'email@test.com', 'customer');

      // Then: 기본값 900 또는 실제 파싱 결과 (NaN 처리 후 기본값)
      expect(result.expiresIn).toBe(900);
    });
  });

  /**
   * 통합 시나리오 테스트
   */
  describe('Integration Scenarios', () => {
    it('should handle complete token lifecycle', async () => {
      // Given
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'customer' as const;

      // When: 토큰 생성
      const tokens = service.generateTokens(userId, email, role);
      
      // Then: 토큰 구조 확인
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');

      // When: 액세스 토큰 검증
      const payload = await service.verifyAccessToken(tokens.accessToken);
      
      // Then: 페이로드 확인
      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);

      // When: 토큰 갱신
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      
      const newTokens = await service.refreshAccessToken(tokens.refreshToken);
      
      // Then: 새로운 토큰 확인
      expect(newTokens.accessToken).toBe('new-access-token');
      expect(newTokens.refreshToken).toBe('new-refresh-token');
    });
  });
}); 