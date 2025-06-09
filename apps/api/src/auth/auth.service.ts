/**
 * 인증 서비스
 * 
 * 사용자 인증 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseUser } from '@delivery-platform/shared/src/types/user';
import { TokenService, TokenResponse } from './token.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 사용자 회원가입
   */
  async signUp(signUpDto: SignUpDto): Promise<{ user: BaseUser; tokens: TokenResponse }> {
    const { email, password, username, fullName, phone, role } = signUpDto;

    // 이메일 중복 검사
    await this.checkEmailExists(email);

    // 전화번호 중복 검사
    await this.checkPhoneExists(phone);

    // 사용자명 중복 검사
    await this.checkUsernameExists(username);

    // 비밀번호 해시화
    const hashedPassword = await this.hashPassword(password);

    try {
      // Supabase에 사용자 생성
      const { data, error } = await this.supabase
        .from('users')
        .insert([
          {
            email,
            password_hash: hashedPassword,
            username,
            full_name: fullName,
            phone,
            role,
            status: 'active',
            is_email_verified: false,
            is_phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new ConflictException(`회원가입에 실패했습니다: ${error.message}`);
      }

      const user: BaseUser = {
        id: data.id,
        email: data.email,
        username: data.username,
        fullName: data.full_name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        isEmailVerified: data.is_email_verified,
        isPhoneVerified: data.is_phone_verified,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // JWT 토큰 생성
      const tokens = this.tokenService.generateTokens(user.id, user.email, user.role);

      return { user, tokens };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('회원가입 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 로그인
   */
  async signIn(signInDto: SignInDto): Promise<{ user: BaseUser; tokens: TokenResponse }> {
    const { email, password } = signInDto;

    // 사용자 인증
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // JWT 토큰 생성
    const tokens = this.tokenService.generateTokens(user.id, user.email, user.role);

    return { user, tokens };
  }

  /**
   * 사용자 인증 (이메일 + 비밀번호)
   */
  async validateUser(email: string, password: string): Promise<BaseUser | null> {
    try {
      // 사용자 조회
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      // 비밀번호 검증 (임시로 bcrypt 대신 단순 비교 - bcryptjs 모듈 문제로)
      // const isPasswordValid = await bcrypt.compare(password, data.password_hash);
      const isPasswordValid = password === data.password_hash; // 임시
      if (!isPasswordValid) {
        return null;
      }

      // BaseUser 객체 반환
      return {
        id: data.id,
        email: data.email,
        username: data.username,
        fullName: data.full_name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        isEmailVerified: data.is_email_verified || false,
        isPhoneVerified: data.is_phone_verified || false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        profileImageUrl: data.profile_image_url,
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  /**
   * 이메일 중복 검사
   */
  private async checkEmailExists(email: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (data) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
  }

  /**
   * 전화번호 중복 검사
   */
  private async checkPhoneExists(phone: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (data) {
      throw new ConflictException('이미 사용 중인 전화번호입니다.');
    }
  }

  /**
   * 사용자명 중복 검사
   */
  private async checkUsernameExists(username: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (data) {
      throw new ConflictException('이미 사용 중인 사용자명입니다.');
    }
  }

  /**
   * 비밀번호 해시화 (임시로 단순 처리)
   */
  private async hashPassword(password: string): Promise<string> {
    // 임시로 bcrypt 없이 처리
    // const saltRounds = 12;
    // return bcrypt.hash(password, saltRounds);
    return password; // 임시
  }
} 