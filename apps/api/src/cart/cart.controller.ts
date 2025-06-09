/**
 * 장바구니 컨트롤러
 * 
 * 장바구니 관리를 위한 REST API 엔드포인트를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpStatus,
  HttpCode,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CartService } from './services/cart.service';
import { CartSessionService } from './services/cart-session.service';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
  CartItemResponseDto,
  CartValidationDto,
  QuickReorderDto,
  CartStatsDto,
} from './dto/cart.dto';

/**
 * 세션 ID 추출 헬퍼 함수
 */
function extractSessionId(headers: any): string {
  return headers['x-session-id'] || headers.sessionid || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 사용자 ID 추출 헬퍼 함수 (JWT에서 추출, 향후 AuthGuard와 연동)
 */
function extractUserId(headers: any): string | undefined {
  // 향후 JWT 토큰에서 사용자 ID 추출
  return headers.authorization ? headers['x-user-id'] : undefined;
}

@ApiTags('장바구니')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly cartSessionService: CartSessionService,
  ) {}

  /**
   * 장바구니 조회
   */
  @Get()
  @ApiOperation({ 
    summary: '장바구니 조회', 
    description: '현재 사용자의 장바구니 내용을 조회합니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '장바구니 조회 성공', 
    type: CartResponseDto 
  })
  @ApiResponse({ 
    status: 204, 
    description: '빈 장바구니' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async getCart(@Headers() headers: any): Promise<CartResponseDto | null> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    return await this.cartService.getCart(sessionId, userId);
  }

  /**
   * 장바구니에 아이템 추가
   */
  @Post('items')
  @ApiOperation({ 
    summary: '장바구니 아이템 추가', 
    description: '장바구니에 새로운 메뉴 아이템을 추가합니다.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: '아이템 추가 성공', 
    type: CartItemResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청 (다른 레스토랑 메뉴, 품절 등)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '메뉴를 찾을 수 없음' 
  })
  @ApiBody({ type: AddCartItemDto })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async addItem(
    @Body(ValidationPipe) addItemDto: AddCartItemDto,
    @Headers() headers: any,
  ): Promise<CartItemResponseDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    return await this.cartService.addItem(sessionId, addItemDto, userId);
  }

  /**
   * 장바구니 아이템 수정
   */
  @Put('items/:itemId')
  @ApiOperation({ 
    summary: '장바구니 아이템 수정', 
    description: '장바구니의 특정 아이템 정보를 수정합니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '아이템 수정 성공', 
    type: CartItemResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: '아이템을 찾을 수 없음' 
  })
  @ApiParam({ 
    name: 'itemId', 
    description: '장바구니 아이템 ID' 
  })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async updateItem(
    @Param('itemId') itemId: string,
    @Body(ValidationPipe) updateDto: UpdateCartItemDto,
    @Headers() headers: any,
  ): Promise<CartItemResponseDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    return await this.cartService.updateItem(sessionId, itemId, updateDto, userId);
  }

  /**
   * 장바구니 아이템 삭제
   */
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: '장바구니 아이템 삭제', 
    description: '장바구니에서 특정 아이템을 삭제합니다.' 
  })
  @ApiResponse({ 
    status: 204, 
    description: '아이템 삭제 성공' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '아이템을 찾을 수 없음' 
  })
  @ApiParam({ 
    name: 'itemId', 
    description: '장바구니 아이템 ID' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async removeItem(
    @Param('itemId') itemId: string,
    @Headers() headers: any,
  ): Promise<void> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    await this.cartService.removeItem(sessionId, itemId, userId);
  }

  /**
   * 장바구니 전체 비우기
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: '장바구니 비우기', 
    description: '장바구니의 모든 아이템을 삭제합니다.' 
  })
  @ApiResponse({ 
    status: 204, 
    description: '장바구니 비우기 성공' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async clearCart(@Headers() headers: any): Promise<void> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    await this.cartService.clearCart(sessionId, userId);
  }

  /**
   * 장바구니 검증
   */
  @Post('validate')
  @ApiOperation({ 
    summary: '장바구니 검증', 
    description: '주문 전 장바구니의 유효성을 검증합니다 (메뉴 가격 변경, 품절 등).' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '검증 완료', 
    type: CartValidationDto 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async validateCart(@Headers() headers: any): Promise<CartValidationDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    return await this.cartService.validateCart(sessionId, userId);
  }

  /**
   * 빠른 재주문
   */
  @Post('reorder')
  @ApiOperation({ 
    summary: '빠른 재주문', 
    description: '이전 주문을 기반으로 장바구니를 구성합니다.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: '재주문 성공', 
    type: CartResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없음' 
  })
  @ApiBody({ type: QuickReorderDto })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async quickReorder(
    @Body(ValidationPipe) quickReorderDto: QuickReorderDto,
    @Headers() headers: any,
  ): Promise<CartResponseDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    return await this.cartService.quickReorder(sessionId, quickReorderDto, userId);
  }

  /**
   * 아이템 수량 증가
   */
  @Post('items/:itemId/increase')
  @ApiOperation({ 
    summary: '아이템 수량 증가', 
    description: '특정 아이템의 수량을 1개 증가시킵니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '수량 증가 성공', 
    type: CartItemResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: '아이템을 찾을 수 없음' 
  })
  @ApiParam({ 
    name: 'itemId', 
    description: '장바구니 아이템 ID' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async increaseQuantity(
    @Param('itemId') itemId: string,
    @Headers() headers: any,
  ): Promise<CartItemResponseDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    // 현재 아이템 정보를 가져와서 수량을 1 증가
    const cart = await this.cartService.getCart(sessionId, userId);
    if (!cart) {
      throw new Error('장바구니를 찾을 수 없습니다.');
    }
    
    const item = cart.items.find(item => item.id === itemId);
    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }
    
    const updateDto: UpdateCartItemDto = {
      quantity: item.quantity + 1
    };
    
    return await this.cartService.updateItem(sessionId, itemId, updateDto, userId);
  }

  /**
   * 아이템 수량 감소
   */
  @Post('items/:itemId/decrease')
  @ApiOperation({ 
    summary: '아이템 수량 감소', 
    description: '특정 아이템의 수량을 1개 감소시킵니다. 수량이 0이 되면 아이템이 삭제됩니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '수량 감소 성공', 
    type: CartItemResponseDto 
  })
  @ApiResponse({ 
    status: 204, 
    description: '아이템 삭제됨 (수량이 0이 됨)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '아이템을 찾을 수 없음' 
  })
  @ApiParam({ 
    name: 'itemId', 
    description: '장바구니 아이템 ID' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async decreaseQuantity(
    @Param('itemId') itemId: string,
    @Headers() headers: any,
  ): Promise<CartItemResponseDto | void> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    // 현재 아이템 정보를 가져와서 수량을 1 감소
    const cart = await this.cartService.getCart(sessionId, userId);
    if (!cart) {
      throw new Error('장바구니를 찾을 수 없습니다.');
    }
    
    const item = cart.items.find(item => item.id === itemId);
    if (!item) {
      throw new Error('아이템을 찾을 수 없습니다.');
    }
    
    if (item.quantity <= 1) {
      // 수량이 1 이하이면 아이템 삭제
      await this.cartService.removeItem(sessionId, itemId, userId);
      return;
    }
    
    const updateDto: UpdateCartItemDto = {
      quantity: item.quantity - 1
    };
    
    return await this.cartService.updateItem(sessionId, itemId, updateDto, userId);
  }

  /**
   * 세션 마이그레이션 (로그인 시)
   */
  @Post('migrate')
  @ApiOperation({ 
    summary: '세션 마이그레이션', 
    description: '익명 세션을 로그인 사용자 계정으로 이전합니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '마이그레이션 성공' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: true 
  })
  @ApiBearerAuth()
  async migrateSession(@Headers() headers: any): Promise<{ message: string }> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    if (!userId) {
      throw new Error('사용자 인증이 필요합니다.');
    }
    
    await this.cartSessionService.migrateAnonymousToUser(sessionId, userId);
    
    return { message: '장바구니가 성공적으로 이전되었습니다.' };
  }

  /**
   * 세션 통계 조회 (관리자용)
   */
  @Get('stats/sessions')
  @ApiOperation({ 
    summary: '세션 통계 조회', 
    description: '현재 활성 세션 통계를 조회합니다 (관리자용).' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '통계 조회 성공' 
  })
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    anonymousSessions: number;
    userSessions: number;
    averageItemsPerCart: number;
  }> {
    return await this.cartSessionService.getSessionStats();
  }

  /**
   * 만료된 세션 정리 (관리자용)
   */
  @Post('admin/cleanup')
  @ApiOperation({ 
    summary: '만료된 세션 정리', 
    description: '만료된 세션들을 정리합니다 (관리자용).' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '정리 완료' 
  })
  async cleanupExpiredSessions(): Promise<{ message: string }> {
    await this.cartSessionService.cleanupExpiredSessions();
    return { message: '만료된 세션이 정리되었습니다.' };
  }

  /**
   * 장바구니 아이템 수량 직접 설정
   */
  @Put('items/:itemId/quantity')
  @ApiOperation({ 
    summary: '아이템 수량 직접 설정', 
    description: '특정 아이템의 수량을 직접 설정합니다.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '수량 설정 성공', 
    type: CartItemResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: '아이템을 찾을 수 없음' 
  })
  @ApiParam({ 
    name: 'itemId', 
    description: '장바구니 아이템 ID' 
  })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        quantity: { 
          type: 'number', 
          minimum: 1, 
          maximum: 99, 
          description: '설정할 수량' 
        } 
      } 
    } 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async setQuantity(
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
    @Headers() headers: any,
  ): Promise<CartItemResponseDto> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    const updateDto: UpdateCartItemDto = {
      quantity: body.quantity
    };
    
    return await this.cartService.updateItem(sessionId, itemId, updateDto, userId);
  }

  /**
   * 장바구니 요약 정보 조회
   */
  @Get('summary')
  @ApiOperation({ 
    summary: '장바구니 요약 조회', 
    description: '장바구니의 간단한 요약 정보만 조회합니다 (아이템 수, 총액 등).' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '요약 정보 조회 성공' 
  })
  @ApiHeader({ 
    name: 'x-session-id', 
    description: '세션 ID', 
    required: false 
  })
  @ApiBearerAuth()
  async getCartSummary(@Headers() headers: any): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalAmount: number;
    restaurantName?: string;
    canOrder: boolean;
  }> {
    const sessionId = extractSessionId(headers);
    const userId = extractUserId(headers);
    
    const cart = await this.cartService.getCart(sessionId, userId);
    
    if (!cart) {
      return {
        totalItems: 0,
        totalQuantity: 0,
        totalAmount: 0,
        canOrder: false
      };
    }
    
    return {
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.pricing.totalAmount,
      restaurantName: cart.restaurant.name,
      canOrder: cart.canOrder
    };
  }
} 