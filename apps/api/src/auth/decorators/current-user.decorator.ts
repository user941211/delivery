/**
 * 현재 사용자 정보 추출 데코레이터
 * 
 * JWT 토큰에서 추출된 현재 로그인한 사용자 정보를 컨트롤러 매개변수로 주입합니다.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BaseUser } from '@delivery-platform/shared/src/types/user';

/**
 * 현재 로그인한 사용자 정보를 가져오는 데코레이터
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: BaseUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof BaseUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 특정 필드만 요청된 경우 해당 필드만 반환
    return data ? user?.[data] : user;
  },
); 