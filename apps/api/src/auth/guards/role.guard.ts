/**
 * 역할 기반 접근 제어 가드
 * 
 * 사용자의 역할을 확인하여 특정 엔드포인트에 대한 접근을 제어합니다.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@delivery-platform/shared/src/types/user';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 역할 기반 접근 제어 가드
 * @Roles 데코레이터로 지정된 역할과 사용자의 역할을 비교하여 접근을 제어합니다.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 사용자의 역할이 요구되는 역할과 일치하는지 확인
   */
  canActivate(context: ExecutionContext): boolean {
    // 메서드 또는 클래스에서 요구되는 역할들 가져오기
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 역할 요구사항이 없으면 통과
    if (!requiredRoles) {
      return true;
    }

    // 요청에서 사용자 정보 가져오기
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 사용자 정보가 없으면 인증 실패
    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // 사용자 역할 확인
    if (!user.role) {
      throw new ForbiddenException('사용자 역할 정보가 없습니다.');
    }

    // 사용자의 역할이 요구되는 역할 중 하나와 일치하는지 확인
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `이 기능에 접근하려면 다음 역할 중 하나가 필요합니다: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
} 