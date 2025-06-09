/**
 * 로컬 인증 전략
 * 
 * Passport Local 전략을 사용하여 이메일/비밀번호 기반 인증을 처리합니다.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { BaseUser } from '@delivery-platform/shared/src/types/user';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // 이메일을 username으로 사용
      passwordField: 'password',
    });
  }

  /**
   * 사용자 인증 검증
   * 이메일과 비밀번호로 사용자를 인증합니다.
   */
  async validate(email: string, password: string): Promise<BaseUser> {
    const user = await this.authService.validateUser(email, password);
    
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return user;
  }
} 