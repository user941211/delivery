/**
 * 역할 기반 접근 제어 데코레이터
 * 
 * 특정 역할의 사용자만 접근할 수 있는 엔드포인트를 정의합니다.
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@delivery-platform/shared/src/types/user';

export const ROLES_KEY = 'roles';

/**
 * 특정 역할의 사용자만 접근할 수 있도록 제한하는 데코레이터
 * 
 * @param roles 접근을 허용할 사용자 역할들
 * 
 * @example
 * ```typescript
 * @Roles('admin', 'restaurant_owner')
 * @Get('admin-only')
 * adminOnlyEndpoint() {
 *   return 'Only admins and restaurant owners can access this';
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles); 