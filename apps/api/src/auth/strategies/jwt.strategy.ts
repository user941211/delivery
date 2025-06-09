/**
 * JWT 인증 전략
 * 
 * Passport JWT 전략을 사용하여 JWT 토큰 기반 인증을 처리합니다.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * JWT 토큰이 유효할 때 호출되는 메서드
   * 토큰에서 추출한 페이로드를 검증하고 사용자 정보를 반환합니다.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // 추가적인 사용자 검증 로직을 여기에 추가할 수 있습니다.
    // 예: 사용자가 활성 상태인지, 계정이 잠겨있지 않은지 등

    return payload;
  }
} 