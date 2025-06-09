/**
 * JWT 토큰 서비스
 * 
 * JWT 토큰의 생성, 검증, 갱신을 담당하는 서비스입니다.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BaseUser } from '@delivery-platform/shared/src/types/user';

/**
 * JWT 페이로드 인터페이스
 */
export interface JwtPayload {
  sub: string;  // 사용자 ID
  email: string;
  role: BaseUser['role'];
  iat?: number;  // 발급 시간
  exp?: number;  // 만료 시간
}

/**
 * 토큰 응답 인터페이스
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshTokenSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    this.refreshTokenExpiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');

    if (!this.jwtSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  /**
   * 액세스 토큰 생성
   */
  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn,
    });
  }

  /**
   * 리프레시 토큰 생성
   */
  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  /**
   * 토큰 쌍 생성 (액세스 + 리프레시)
   */
  generateTokens(userId: string, email: string, role: BaseUser['role']): TokenResponse {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // 액세스 토큰 만료 시간을 초 단위로 계산
    const expiresIn = this.parseExpirationTime(this.jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * 액세스 토큰 검증
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * 리프레시 토큰 검증
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 리프레시 토큰으로 새로운 액세스 토큰 생성
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    
    // 새로운 토큰 쌍 생성
    return this.generateTokens(payload.sub, payload.email, payload.role);
  }

  /**
   * 토큰에서 사용자 정보 추출
   */
  extractPayload(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * 만료 시간 문자열을 초 단위로 변환
   */
  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 기본값: 15분
    }
  }
} 