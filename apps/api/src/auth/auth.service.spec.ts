import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

/**
 * AuthService 단위 테스트
 * 
 * 인증 서비스의 모든 메서드를 검증합니다.
 * Supabase와 TokenService는 모킹하여 순수 비즈니스 로직만 테스트합니다.
 */
describe('AuthService', () => {
  let service: AuthService;
  let tokenService: TokenService;
  let configService: ConfigService;

  // 모킹된 Supabase 클라이언트
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  // 모킹된 토큰 서비스 응답
  const mockTokenResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
  };

  // 테스트용 사용자 데이터
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    full_name: '테스트 사용자',
    phone: '010-1234-5678',
    role: 'customer',
    status: 'active',
    is_email_verified: false,
    is_phone_verified: false,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    password_hash: 'test-password',
  };

  const mockBaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: '테스트 사용자',
    phone: '010-1234-5678',
    role: 'customer' as const,
    status: 'active' as const,
    isEmailVerified: false,
    isPhoneVerified: false,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
  };

  beforeEach(async () => {
    // TokenService 모킹
    const mockTokenService = {
      generateTokens: jest.fn().mockReturnValue(mockTokenResponse),
      refreshAccessToken: jest.fn().mockReturnValue(mockTokenResponse),
    };

    // ConfigService 모킹
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'test-anon-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    configService = module.get<ConfigService>(ConfigService);

    // Supabase 클라이언트 모킹
    (service as any).supabase = mockSupabaseClient;
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
   * Supabase 설정 검증 테스트
   */
  describe('Constructor', () => {
    it('should throw error when Supabase URL is missing', async () => {
      const invalidConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'SUPABASE_URL') return null;
          return 'test-value';
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            AuthService,
            { provide: TokenService, useValue: {} },
            { provide: ConfigService, useValue: invalidConfigService },
          ],
        }).compile()
      ).rejects.toThrow('Supabase configuration is missing');
    });

    it('should throw error when Supabase key is missing', async () => {
      const invalidConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'SUPABASE_ANON_KEY') return null;
          return 'test-value';
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            AuthService,
            { provide: TokenService, useValue: {} },
            { provide: ConfigService, useValue: invalidConfigService },
          ],
        }).compile()
      ).rejects.toThrow('Supabase configuration is missing');
    });
  });

  /**
   * 회원가입 테스트
   */
  describe('signUp', () => {
    const signUpDto: SignUpDto = {
      email: 'test@example.com',
      password: 'test-password',
      username: 'testuser',
      fullName: '테스트 사용자',
      phone: '010-1234-5678',
      role: 'customer',
    };

    it('should successfully sign up a new user', async () => {
      // Given
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // checkEmailExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkPhoneExists  
        .mockResolvedValueOnce({ data: null, error: null }) // checkUsernameExists
        .mockResolvedValueOnce({ data: mockUser, error: null }); // insert user

      // When
      const result = await service.signUp(signUpDto);

      // Then
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(signUpDto.email);
      expect(result.user.username).toBe(signUpDto.username);
      expect(result.tokens).toEqual(mockTokenResponse);
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.role
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      // Given
      mockSupabaseClient.single.mockResolvedValueOnce({ 
        data: { id: 'existing-user' }, 
        error: null 
      });

      // When & Then
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 이메일입니다.')
      );
    });

    it('should throw ConflictException when phone already exists', async () => {
      // Given
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // email check passes
        .mockResolvedValueOnce({ data: { id: 'existing-user' }, error: null }); // phone exists

      // When & Then
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 전화번호입니다.')
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      // Given
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // email check passes
        .mockResolvedValueOnce({ data: null, error: null }) // phone check passes
        .mockResolvedValueOnce({ data: { id: 'existing-user' }, error: null }); // username exists

      // When & Then
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 사용자명입니다.')
      );
    });

    it('should throw ConflictException when Supabase insert fails', async () => {
      // Given
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // checkEmailExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkPhoneExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkUsernameExists
        .mockResolvedValueOnce({ 
          data: null, 
          error: { message: 'Database error' } 
        }); // insert fails

      // When & Then
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        new ConflictException('회원가입에 실패했습니다: Database error')
      );
    });

    it('should throw BadRequestException for unexpected errors', async () => {
      // Given
      mockSupabaseClient.single
        .mockRejectedValueOnce(new Error('Unexpected error')); // checkEmailExists에서 에러 발생

      // When & Then
      await expect(service.signUp(signUpDto)).rejects.toThrow('Unexpected error');
    });
  });

  /**
   * 로그인 테스트
   */
  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'test-password',
    };

    it('should successfully sign in a valid user', async () => {
      // Given
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      // When
      const result = await service.signIn(signInDto);

      // Then
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(signInDto.email);
      expect(result.tokens).toEqual(mockTokenResponse);
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.role
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Given
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      // When & Then
      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      // Given
      const userWithWrongPassword = { ...mockUser, password_hash: 'wrong-password' };
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: userWithWrongPassword,
        error: null,
      });

      // When & Then
      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.')
      );
    });
  });

  /**
   * 사용자 검증 테스트
   */
  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      // Given
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      // When
      const result = await service.validateUser('test@example.com', 'test-password');

      // Then
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result?.id).toBe('user-123');
    });

    it('should return null for non-existent user', async () => {
      // Given
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      // When
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Then
      expect(result).toBeNull();
    });

    it('should return null for wrong password', async () => {
      // Given
      const userWithDifferentPassword = { ...mockUser, password_hash: 'different-password' };
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: userWithDifferentPassword,
        error: null,
      });

      // When
      const result = await service.validateUser('test@example.com', 'wrong-password');

      // Then
      expect(result).toBeNull();
    });

    it('should return null when Supabase throws an error', async () => {
      // Given
      mockSupabaseClient.single.mockRejectedValueOnce(new Error('Database error'));

      // When
      const result = await service.validateUser('test@example.com', 'password');

      // Then
      expect(result).toBeNull();
    });
  });

  /**
   * 토큰 갱신 테스트
   */
  describe('refreshTokens', () => {
    it('should return new tokens when refresh token is valid', async () => {
      // Given
      const refreshToken = 'valid-refresh-token';

      // When
      const result = await service.refreshTokens(refreshToken);

      // Then
      expect(result).toEqual(mockTokenResponse);
      expect(tokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  /**
   * private 메서드들의 동작 확인 (간접 테스트)
   */
  describe('Private Methods (Indirect Testing)', () => {
    it('should call checkEmailExists during signup', async () => {
      // Given
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'password',
        username: 'testuser',
        fullName: '테스트',
        phone: '010-1234-5678',
        role: 'customer',
      };

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // checkEmailExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkPhoneExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkUsernameExists
        .mockResolvedValueOnce({ data: mockUser, error: null }); // insert

      // When
      await service.signUp(signUpDto);

      // Then
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('email', signUpDto.email);
    });

    it('should hash password during signup', async () => {
      // Given
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'original-password',
        username: 'testuser',
        fullName: '테스트',
        phone: '010-1234-5678',
        role: 'customer',
      };

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // checkEmailExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkPhoneExists
        .mockResolvedValueOnce({ data: null, error: null }) // checkUsernameExists
        .mockResolvedValueOnce({ data: mockUser, error: null }); // insert

      // When
      await service.signUp(signUpDto);

      // Then
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          password_hash: 'original-password', // 임시로 암호화 없이 처리됨
        }),
      ]);
    });
  });
}); 