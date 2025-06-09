/**
 * JWT 인증 가드
 * 
 * JWT 토큰을 검증하여 사용자 인증을 처리합니다.
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * JWT 토큰 기반 인증 가드
 * Passport의 jwt 전략을 사용하여 토큰을 검증합니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 요청이 인증을 거쳐야 하는지 판단
   */
  canActivate(context: ExecutionContext) {
    // 공개 엔드포인트 확인
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * 인증 실패 시 예외 처리
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    return user;
  }
} 