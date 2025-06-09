/**
 * TokenService 통합 테스트
 * 
 * 실제 JWT 토큰 생성, 검증, 갱신 플로우를 통합적으로 테스트합니다.
 * ConfigService와 JwtService의 실제 동작을 포함하여 검증합니다.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService, JwtPayload } from './token.service';

describe('TokenService Integration Tests', () => {
  let tokenService: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  // 테스트용 환경 변수
  const testConfig = {
    JWT_SECRET: 'test-jwt-secret-for-integration-tests',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-for-integration-tests',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => testConfig],
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [TokenService],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  /**
   * 서비스 초기화 및 설정 검증
   */
  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(tokenService).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should have correct configuration', () => {
      // 실제 환경에서는 기본 설정이 사용될 수 있으므로 존재 여부만 확인
      expect(configService.get('JWT_SECRET')).toBeDefined();
      expect(configService.get('JWT_EXPIRES_IN')).toBeDefined();
      expect(configService.get('REFRESH_TOKEN_SECRET')).toBeDefined();
      expect(configService.get('REFRESH_TOKEN_EXPIRES_IN')).toBeDefined();
    });
  });

  /**
   * 토큰 생성 통합 테스트
   */
  describe('Token Generation Integration', () => {
    const testPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'customer',
    };

    it('should generate valid access token', () => {
      // When
      const accessToken = tokenService.generateAccessToken(testPayload);

      // Then
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3); // JWT 구조: header.payload.signature
      
      // 토큰이 실제로 JwtService로 생성되었는지 확인
      const decoded = jwtService.decode(accessToken) as JwtPayload;
      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should generate valid refresh token', () => {
      // When
      const refreshToken = tokenService.generateRefreshToken(testPayload);

      // Then
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
      
      // 리프레시 토큰도 유효한 페이로드를 가져야 함
      const decoded = tokenService.extractPayload(refreshToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.sub);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should generate complete token pair', () => {
      // When
      const tokens = tokenService.generateTokens(
        testPayload.sub,
        testPayload.email,
        testPayload.role
      );

      // Then
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
      expect(tokens.expiresIn).toBe(900); // 15분 = 900초
      
      // 두 토큰이 다른지 확인
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  /**
   * 토큰 검증 통합 테스트
   */
  describe('Token Verification Integration', () => {
    const testPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'user-456',
      email: 'verify@example.com',
      role: 'restaurant_owner',
    };

    it('should verify valid access token', async () => {
      // Given
      const accessToken = tokenService.generateAccessToken(testPayload);

      // When
      const payload = await tokenService.verifyAccessToken(accessToken);

      // Then
      expect(payload.sub).toBe(testPayload.sub);
      expect(payload.email).toBe(testPayload.email);
      expect(payload.role).toBe(testPayload.role);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should verify valid refresh token', async () => {
      // Given
      const refreshToken = tokenService.generateRefreshToken(testPayload);

      // When
      const payload = await tokenService.verifyRefreshToken(refreshToken);

      // Then
      expect(payload.sub).toBe(testPayload.sub);
      expect(payload.email).toBe(testPayload.email);
      expect(payload.role).toBe(testPayload.role);
    });

    it('should reject invalid access token', async () => {
      // Given
      const invalidToken = 'invalid.jwt.token';

      // When & Then
      await expect(tokenService.verifyAccessToken(invalidToken))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid refresh token', async () => {
      // Given
      const invalidToken = 'invalid.refresh.token';

      // When & Then
      await expect(tokenService.verifyRefreshToken(invalidToken))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject access token as refresh token', async () => {
      // Given: 액세스 토큰을 생성
      const accessToken = tokenService.generateAccessToken(testPayload);

      // When & Then: 리프레시 토큰으로 검증하면 실패해야 함
      await expect(tokenService.verifyRefreshToken(accessToken))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  /**
   * 토큰 갱신 통합 테스트
   */
  describe('Token Refresh Integration', () => {
    const testPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'user-789',
      email: 'refresh@example.com',
      role: 'admin',
    };

    it('should refresh tokens successfully', async () => {
      // Given
      const originalTokens = tokenService.generateTokens(
        testPayload.sub,
        testPayload.email,
        testPayload.role
      );

      // Wait 1 second to ensure different iat timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // When
      const newTokens = await tokenService.refreshAccessToken(originalTokens.refreshToken);

      // Then
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens).toHaveProperty('expiresIn');
      
      // 새 토큰들이 유효한지 확인
      expect(typeof newTokens.accessToken).toBe('string');
      expect(typeof newTokens.refreshToken).toBe('string');
      
      // 새 토큰들이 같은 사용자 정보를 가지는지 확인
      const newPayload = await tokenService.verifyAccessToken(newTokens.accessToken);
      expect(newPayload.sub).toBe(testPayload.sub);
      expect(newPayload.email).toBe(testPayload.email);
      expect(newPayload.role).toBe(testPayload.role);
    });

    it('should fail to refresh with invalid refresh token', async () => {
      // Given
      const invalidRefreshToken = 'invalid.refresh.token';

      // When & Then
      await expect(tokenService.refreshAccessToken(invalidRefreshToken))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  /**
   * 페이로드 추출 통합 테스트
   */
  describe('Payload Extraction Integration', () => {
    const testPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'user-000',
      email: 'extract@example.com',
      role: 'customer',
    };

    it('should extract payload from valid token', () => {
      // Given
      const token = tokenService.generateAccessToken(testPayload);

      // When
      const extractedPayload = tokenService.extractPayload(token);

      // Then
      expect(extractedPayload).not.toBeNull();
      expect(extractedPayload?.sub).toBe(testPayload.sub);
      expect(extractedPayload?.email).toBe(testPayload.email);
      expect(extractedPayload?.role).toBe(testPayload.role);
    });

    it('should return null for invalid token', () => {
      // Given
      const invalidToken = 'completely.invalid.token';

      // When
      const extractedPayload = tokenService.extractPayload(invalidToken);

      // Then
      expect(extractedPayload).toBeNull();
    });
  });

  /**
   * 전체 플로우 통합 테스트
   */
  describe('Complete Flow Integration', () => {
    it('should handle complete authentication flow', async () => {
      const userId = 'flow-test-user';
      const email = 'flow@example.com';
      const role = 'customer' as const;

      // 1. 초기 토큰 생성
      const initialTokens = tokenService.generateTokens(userId, email, role);
      expect(initialTokens.accessToken).toBeDefined();
      expect(initialTokens.refreshToken).toBeDefined();

      // 2. 액세스 토큰 검증
      const verifiedPayload = await tokenService.verifyAccessToken(initialTokens.accessToken);
      expect(verifiedPayload.sub).toBe(userId);
      expect(verifiedPayload.email).toBe(email);
      expect(verifiedPayload.role).toBe(role);

      // Wait 1 second to ensure different iat timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 토큰 갱신
      const refreshedTokens = await tokenService.refreshAccessToken(initialTokens.refreshToken);
      expect(refreshedTokens.accessToken).toBeDefined();

      // 4. 새로운 액세스 토큰 검증
      const newVerifiedPayload = await tokenService.verifyAccessToken(refreshedTokens.accessToken);
      expect(newVerifiedPayload.sub).toBe(userId);
      expect(newVerifiedPayload.email).toBe(email);
      expect(newVerifiedPayload.role).toBe(role);

      // 5. 페이로드 추출 확인
      const extractedPayload = tokenService.extractPayload(refreshedTokens.accessToken);
      expect(extractedPayload?.sub).toBe(userId);
      expect(extractedPayload?.email).toBe(email);
      expect(extractedPayload?.role).toBe(role);
    });

    it('should handle different user roles correctly', async () => {
      const roles = ['customer', 'restaurant_owner', 'admin'] as const;
      
      for (const role of roles) {
        // Given
        const userId = `user-${role}`;
        const email = `${role}@example.com`;

        // When
        const tokens = tokenService.generateTokens(userId, email, role);
        const payload = await tokenService.verifyAccessToken(tokens.accessToken);

        // Then
        expect(payload.role).toBe(role);
        expect(payload.sub).toBe(userId);
        expect(payload.email).toBe(email);
      }
    });
  });

  /**
   * 시간 기반 테스트
   */
  describe('Time-based Tests', () => {
    it('should include valid timestamps in tokens', async () => {
      // Given
      const before = Math.floor(Date.now() / 1000);
      
      // When
      const tokens = tokenService.generateTokens('time-user', 'time@example.com', 'customer');
      const payload = await tokenService.verifyAccessToken(tokens.accessToken);
      
      // Then
      const after = Math.floor(Date.now() / 1000);
      
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect(payload.iat).toBeLessThanOrEqual(after);
      expect(payload.exp).toBeGreaterThan(payload.iat);
      
      // 만료 시간이 약 15분 후인지 확인 (±10초 허용)
      const expectedExp = payload.iat + 900; // 15분 = 900초
      expect(Math.abs(payload.exp - expectedExp)).toBeLessThan(10);
    });

    it('should handle expiration time parsing correctly', () => {
      // Given & When
      const tokens1 = tokenService.generateTokens('user1', 'test1@example.com', 'customer');
      const tokens2 = tokenService.generateTokens('user2', 'test2@example.com', 'customer');

      // Then
      expect(tokens1.expiresIn).toBe(900); // 15m = 900초
      expect(tokens2.expiresIn).toBe(900);
      expect(tokens1.expiresIn).toBe(tokens2.expiresIn);
    });
  });
}) 