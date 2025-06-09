/**
 * 역할 기반 접근 제어 가드
 * 
 * 사용자의 역할에 따라 API 접근을 제어합니다.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@delivery-platform/shared/src/types/user';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 요청된 엔드포인트에 접근할 수 있는지 확인
   */
  canActivate(context: ExecutionContext): boolean {
    // 메서드와 클래스에서 필요한 역할 정보 추출
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 역할 제한이 없으면 접근 허용
    if (!requiredRoles) {
      return true;
    }

    // 요청에서 사용자 정보 추출 (JWT 가드에서 설정됨)
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('사용자 정보를 찾을 수 없습니다.');
    }

    // 사용자의 역할이 필요한 역할 중 하나와 일치하는지 확인
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('이 기능에 접근할 권한이 없습니다.');
    }

    return true;
  }
} 