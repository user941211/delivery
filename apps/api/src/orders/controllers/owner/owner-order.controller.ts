/**
 * 점주용 주문 관리 API 컨트롤러
 * 
 * 점주가 주문을 관리하고 처리하기 위한 REST API 엔드포인트를 제공합니다.
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
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';

import { OwnerOrderService } from '../../services/owner/owner-order.service';

import {
  OwnerOrderQueryDto,
  OwnerOrderDetailDto,
  OwnerOrderListResponseDto,
  OwnerOrderStatsDto,
  UpdateOrderStatusDto,
  RejectOrderDto,
  SetCookingTimeDto,
  BulkOrderActionDto,
  OwnerOrderStatus
} from '../../dto/owner/owner-order.dto';

/**
 * 성공 응답 래퍼 인터페이스
 */
interface SuccessResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 에러 응답 인터페이스
 */
interface ErrorResponse {
  success: boolean;
  message: string;
  error: {
    code: string;
    details?: any;
  };
  timestamp: string;
}

@ApiTags('점주용 주문 관리')
@Controller('owner/orders')
@ApiBearerAuth()
export class OwnerOrderController {
  private readonly logger = new Logger(OwnerOrderController.name);

  constructor(
    private readonly ownerOrderService: OwnerOrderService,
  ) {}

  /**
   * 점주별 주문 목록 조회
   */
  @Get()
  @ApiOperation({
    summary: '점주별 주문 목록 조회',
    description: '점주의 매장에 대한 주문 목록을 필터링 및 페이지네이션으로 조회합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiHeader({
    name: 'X-Restaurant-ID',
    description: '매장 ID',
    required: true,
    example: 'restaurant_67890'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 아이템 수', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: '주문 상태 필터', enum: OwnerOrderStatus })
  @ApiQuery({ name: 'startDate', required: false, description: '시작 날짜', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, description: '종료 날짜', example: '2024-01-31' })
  @ApiQuery({ name: 'orderNumber', required: false, description: '주문번호로 검색' })
  @ApiQuery({ name: 'customerName', required: false, description: '고객명으로 검색' })
  @ApiQuery({ name: 'urgentOnly', required: false, description: '긴급 주문만 조회', type: Boolean })
  @ApiResponse({
    status: 200,
    description: '주문 목록 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 목록을 성공적으로 조회했습니다.' },
        data: {
          type: 'object',
          properties: {
            orders: { type: 'array', items: { $ref: '#/components/schemas/OwnerOrderDetailDto' } },
            totalCount: { type: 'number', example: 150 },
            currentPage: { type: 'number', example: 1 },
            totalPages: { type: 'number', example: 8 },
            limit: { type: 'number', example: 20 },
            hasNext: { type: 'boolean', example: true },
            hasPrevious: { type: 'boolean', example: false }
          }
        },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 파라미터' })
  @ApiResponse({ status: 403, description: '매장 접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async getOrders(
    @Headers('X-Owner-ID') ownerId: string,
    @Headers('X-Restaurant-ID') restaurantId: string,
    @Query() queryDto: OwnerOrderQueryDto
  ): Promise<SuccessResponse<OwnerOrderListResponseDto>> {
    try {
      this.logger.log(`Getting orders for owner: ${ownerId}, restaurant: ${restaurantId}`);

      if (!ownerId || !restaurantId) {
        throw new BadRequestException('점주 ID와 매장 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.getOrdersForOwner(ownerId, restaurantId, queryDto);

      return {
        success: true,
        message: '주문 목록을 성공적으로 조회했습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Orders fetch failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 특정 주문 상세 조회
   */
  @Get(':orderId')
  @ApiOperation({
    summary: '특정 주문 상세 조회',
    description: '점주가 특정 주문의 상세 정보를 조회합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiParam({
    name: 'orderId',
    description: '주문 ID',
    example: 'order_67890'
  })
  @ApiResponse({
    status: 200,
    description: '주문 상세 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 상세 정보를 성공적으로 조회했습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderDetailDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 403, description: '주문 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async getOrderDetail(
    @Headers('X-Owner-ID') ownerId: string,
    @Param('orderId') orderId: string
  ): Promise<SuccessResponse<OwnerOrderDetailDto>> {
    try {
      this.logger.log(`Getting order detail: ${orderId} for owner: ${ownerId}`);

      if (!ownerId) {
        throw new BadRequestException('점주 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.getOrderDetail(ownerId, orderId);

      return {
        success: true,
        message: '주문 상세 정보를 성공적으로 조회했습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order detail fetch failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 주문 상태 업데이트
   */
  @Put(':orderId/status')
  @ApiOperation({
    summary: '주문 상태 업데이트',
    description: '점주가 주문의 상태를 변경합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiParam({
    name: 'orderId',
    description: '주문 ID',
    example: 'order_67890'
  })
  @ApiBody({
    type: UpdateOrderStatusDto,
    description: '주문 상태 업데이트 정보',
    examples: {
      confirm: {
        summary: '주문 확인',
        value: {
          status: 'CONFIRMED',
          memo: '주문을 확인했습니다.',
          notifyCustomer: true
        }
      },
      startCooking: {
        summary: '조리 시작',
        value: {
          status: 'PREPARING',
          estimatedCookingTime: 25,
          memo: '조리를 시작합니다.',
          notifyCustomer: true
        }
      },
      ready: {
        summary: '조리 완료',
        value: {
          status: 'READY',
          memo: '조리가 완료되었습니다.',
          notifyCustomer: true
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '주문 상태 업데이트 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 상태가 성공적으로 업데이트되었습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderDetailDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '잘못된 상태 전환 요청' })
  @ApiResponse({ status: 403, description: '주문 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async updateOrderStatus(
    @Headers('X-Owner-ID') ownerId: string,
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateOrderStatusDto
  ): Promise<SuccessResponse<OwnerOrderDetailDto>> {
    try {
      this.logger.log(`Updating order status: ${orderId} to ${updateDto.status} by owner: ${ownerId}`);

      if (!ownerId) {
        throw new BadRequestException('점주 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.updateOrderStatus(ownerId, orderId, updateDto);

      return {
        success: true,
        message: '주문 상태가 성공적으로 업데이트되었습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order status update failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 주문 거부 처리
   */
  @Post(':orderId/reject')
  @ApiOperation({
    summary: '주문 거부 처리',
    description: '점주가 주문을 거부하고 환불을 처리합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiParam({
    name: 'orderId',
    description: '주문 ID',
    example: 'order_67890'
  })
  @ApiBody({
    type: RejectOrderDto,
    description: '주문 거부 정보',
    examples: {
      outOfStock: {
        summary: '재료 부족',
        value: {
          reason: '재료 부족',
          detailReason: '주요 재료가 소진되어 조리가 어렵습니다.',
          customerMessage: '죄송합니다. 재료 부족으로 주문을 처리할 수 없습니다.',
          autoRefund: true
        }
      },
      kitchenBusy: {
        summary: '주방 과부하',
        value: {
          reason: '주방 과부하',
          detailReason: '현재 주문량이 많아 추가 주문을 받기 어렵습니다.',
          customerMessage: '죄송합니다. 현재 주문량이 많아 처리가 어렵습니다.',
          autoRefund: true
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '주문 거부 처리 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문이 성공적으로 거부되었습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderDetailDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '거부할 수 없는 주문 상태' })
  @ApiResponse({ status: 403, description: '주문 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async rejectOrder(
    @Headers('X-Owner-ID') ownerId: string,
    @Param('orderId') orderId: string,
    @Body() rejectDto: RejectOrderDto
  ): Promise<SuccessResponse<OwnerOrderDetailDto>> {
    try {
      this.logger.log(`Rejecting order: ${orderId} by owner: ${ownerId}`);

      if (!ownerId) {
        throw new BadRequestException('점주 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.rejectOrder(ownerId, orderId, rejectDto);

      return {
        success: true,
        message: '주문이 성공적으로 거부되었습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order rejection failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 조리 시간 설정
   */
  @Put(':orderId/cooking-time')
  @ApiOperation({
    summary: '조리 시간 설정',
    description: '점주가 특정 주문의 예상 조리 시간을 설정합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiParam({
    name: 'orderId',
    description: '주문 ID',
    example: 'order_67890'
  })
  @ApiBody({
    type: SetCookingTimeDto,
    description: '조리 시간 설정 정보',
    examples: {
      normal: {
        summary: '일반 조리 시간',
        value: {
          estimatedCookingTime: 25,
          reason: '표준 조리 시간입니다.',
          notifyCustomer: true
        }
      },
      delayed: {
        summary: '지연 조리 시간',
        value: {
          estimatedCookingTime: 45,
          reason: '주문량이 많아 시간이 더 필요합니다.',
          notifyCustomer: true
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '조리 시간 설정 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '조리 시간이 성공적으로 설정되었습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderDetailDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '조리 시간 설정 불가능한 상태' })
  @ApiResponse({ status: 403, description: '주문 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async setCookingTime(
    @Headers('X-Owner-ID') ownerId: string,
    @Param('orderId') orderId: string,
    @Body() setCookingTimeDto: SetCookingTimeDto
  ): Promise<SuccessResponse<OwnerOrderDetailDto>> {
    try {
      this.logger.log(`Setting cooking time for order: ${orderId} to ${setCookingTimeDto.estimatedCookingTime} minutes`);

      if (!ownerId) {
        throw new BadRequestException('점주 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.setCookingTime(ownerId, orderId, setCookingTimeDto);

      return {
        success: true,
        message: '조리 시간이 성공적으로 설정되었습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Cooking time setting failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 주문 일괄 처리
   */
  @Post('bulk-action')
  @ApiOperation({
    summary: '주문 일괄 처리',
    description: '여러 주문을 한 번에 처리합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiHeader({
    name: 'X-Restaurant-ID',
    description: '매장 ID',
    required: true,
    example: 'restaurant_67890'
  })
  @ApiBody({
    type: BulkOrderActionDto,
    description: '일괄 처리 정보',
    examples: {
      confirmMultiple: {
        summary: '여러 주문 확인',
        value: {
          orderIds: ['order_1', 'order_2', 'order_3'],
          action: 'confirm',
          reason: '일괄 주문 승인'
        }
      },
      startCookingMultiple: {
        summary: '여러 주문 조리 시작',
        value: {
          orderIds: ['order_4', 'order_5'],
          action: 'start_cooking',
          reason: '일괄 조리 시작',
          estimatedCookingTime: 30
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '일괄 처리 완료',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '일괄 처리가 완료되었습니다.' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'array', items: { type: 'string' }, example: ['order_1', 'order_2'] },
            failed: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  orderId: { type: 'string' },
                  reason: { type: 'string' }
                }
              },
              example: [{ orderId: 'order_3', reason: '이미 처리된 주문입니다.' }]
            }
          }
        },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '잘못된 일괄 처리 요청' })
  @ApiResponse({ status: 403, description: '매장 접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async bulkOrderAction(
    @Headers('X-Owner-ID') ownerId: string,
    @Headers('X-Restaurant-ID') restaurantId: string,
    @Body() bulkActionDto: BulkOrderActionDto
  ): Promise<SuccessResponse<{ success: string[]; failed: Array<{ orderId: string; reason: string }> }>> {
    try {
      this.logger.log(`Bulk order action: ${bulkActionDto.action} for ${bulkActionDto.orderIds.length} orders`);

      if (!ownerId || !restaurantId) {
        throw new BadRequestException('점주 ID와 매장 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.bulkOrderAction(ownerId, restaurantId, bulkActionDto);

      return {
        success: true,
        message: '일괄 처리가 완료되었습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Bulk order action failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 점주용 주문 통계 조회
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: '점주용 주문 통계 조회',
    description: '점주의 매장에 대한 주문 통계를 조회합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiHeader({
    name: 'X-Restaurant-ID',
    description: '매장 ID',
    required: true,
    example: 'restaurant_67890'
  })
  @ApiQuery({ name: 'startDate', required: false, description: '시작 날짜', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, description: '종료 날짜', example: '2024-01-31' })
  @ApiResponse({
    status: 200,
    description: '주문 통계 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 통계를 성공적으로 조회했습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderStatsDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 403, description: '매장 접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async getOrderStats(
    @Headers('X-Owner-ID') ownerId: string,
    @Headers('X-Restaurant-ID') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<SuccessResponse<OwnerOrderStatsDto>> {
    try {
      this.logger.log(`Getting order stats for restaurant: ${restaurantId}`);

      if (!ownerId || !restaurantId) {
        throw new BadRequestException('점주 ID와 매장 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.getOrderStats(ownerId, restaurantId, startDate, endDate);

      return {
        success: true,
        message: '주문 통계를 성공적으로 조회했습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order stats fetch failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 실시간 대기 중인 주문 조회
   */
  @Get('pending/list')
  @ApiOperation({
    summary: '실시간 대기 중인 주문 조회',
    description: '현재 처리가 필요한 주문들을 조회합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiHeader({
    name: 'X-Restaurant-ID',
    description: '매장 ID',
    required: true,
    example: 'restaurant_67890'
  })
  @ApiResponse({
    status: 200,
    description: '대기 주문 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '대기 중인 주문을 성공적으로 조회했습니다.' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/OwnerOrderDetailDto' }
        },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 403, description: '매장 접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async getPendingOrders(
    @Headers('X-Owner-ID') ownerId: string,
    @Headers('X-Restaurant-ID') restaurantId: string
  ): Promise<SuccessResponse<OwnerOrderDetailDto[]>> {
    try {
      this.logger.log(`Getting pending orders for restaurant: ${restaurantId}`);

      if (!ownerId || !restaurantId) {
        throw new BadRequestException('점주 ID와 매장 ID는 필수입니다.');
      }

      const result = await this.ownerOrderService.getPendingOrders(ownerId, restaurantId);

      return {
        success: true,
        message: '대기 중인 주문을 성공적으로 조회했습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Pending orders fetch failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 주문 상태 변경 이력 조회
   */
  @Get(':orderId/history')
  @ApiOperation({
    summary: '주문 상태 변경 이력 조회',
    description: '특정 주문의 상태 변경 이력을 조회합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiParam({
    name: 'orderId',
    description: '주문 ID',
    example: 'order_67890'
  })
  @ApiResponse({
    status: 200,
    description: '주문 이력 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 이력을 성공적으로 조회했습니다.' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: Object.values(OwnerOrderStatus) },
              changedAt: { type: 'string', format: 'date-time' },
              changedBy: { type: 'string' },
              memo: { type: 'string' }
            }
          }
        },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 403, description: '주문 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async getOrderHistory(
    @Headers('X-Owner-ID') ownerId: string,
    @Param('orderId') orderId: string
  ): Promise<SuccessResponse<any[]>> {
    try {
      this.logger.log(`Getting order history: ${orderId} for owner: ${ownerId}`);

      if (!ownerId) {
        throw new BadRequestException('점주 ID는 필수입니다.');
      }

      // 주문 상세 조회를 통해 이력 정보 포함
      const orderDetail = await this.ownerOrderService.getOrderDetail(ownerId, orderId);

      return {
        success: true,
        message: '주문 이력을 성공적으로 조회했습니다.',
        data: orderDetail.statusHistory,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order history fetch failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 주문 검색 (고급 검색)
   */
  @Post('search')
  @ApiOperation({
    summary: '주문 고급 검색',
    description: '다양한 조건으로 주문을 검색합니다.'
  })
  @ApiHeader({
    name: 'X-Owner-ID',
    description: '점주 ID (임시 인증)',
    required: true,
    example: 'owner_12345'
  })
  @ApiHeader({
    name: 'X-Restaurant-ID',
    description: '매장 ID',
    required: true,
    example: 'restaurant_67890'
  })
  @ApiBody({
    description: '검색 조건',
    schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '검색 키워드 (주문번호, 고객명, 메뉴명)' },
        statuses: { type: 'array', items: { type: 'string', enum: Object.values(OwnerOrderStatus) } },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          }
        },
        amountRange: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' }
          }
        },
        page: { type: 'number', default: 1 },
        limit: { type: 'number', default: 20 }
      }
    },
    examples: {
      keywordSearch: {
        summary: '키워드 검색',
        value: {
          keyword: '김고객',
          page: 1,
          limit: 20
        }
      },
      statusFilter: {
        summary: '상태별 필터',
        value: {
          statuses: ['NEW', 'CONFIRMED'],
          dateRange: {
            start: '2024-12-01',
            end: '2024-12-07'
          },
          page: 1,
          limit: 20
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '주문 검색 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '주문 검색을 성공적으로 완료했습니다.' },
        data: { $ref: '#/components/schemas/OwnerOrderListResponseDto' },
        timestamp: { type: 'string', example: '2024-12-07T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: '잘못된 검색 조건' })
  @ApiResponse({ status: 403, description: '매장 접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 내부 오류' })
  async searchOrders(
    @Headers('X-Owner-ID') ownerId: string,
    @Headers('X-Restaurant-ID') restaurantId: string,
    @Body() searchDto: any
  ): Promise<SuccessResponse<OwnerOrderListResponseDto>> {
    try {
      this.logger.log(`Searching orders for restaurant: ${restaurantId} with keyword: ${searchDto.keyword}`);

      if (!ownerId || !restaurantId) {
        throw new BadRequestException('점주 ID와 매장 ID는 필수입니다.');
      }

      // 검색 조건을 OwnerOrderQueryDto로 변환
      const queryDto: OwnerOrderQueryDto = {
        page: searchDto.page || 1,
        limit: searchDto.limit || 20,
        customerName: searchDto.keyword,
        orderNumber: searchDto.keyword,
        startDate: searchDto.dateRange?.start,
        endDate: searchDto.dateRange?.end,
        status: searchDto.statuses?.[0] // 첫 번째 상태만 사용 (단순화)
      };

      const result = await this.ownerOrderService.getOrdersForOwner(ownerId, restaurantId, queryDto);

      return {
        success: true,
        message: '주문 검색을 성공적으로 완료했습니다.',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Order search failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 에러 처리 헬퍼 메서드
   */
  private handleError(error: any): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    if (error instanceof NotFoundException) {
      throw error;
    }
    if (error instanceof ForbiddenException) {
      throw error;
    }
    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    // 알 수 없는 에러는 내부 서버 오류로 처리
    throw new InternalServerErrorException('서버 내부 오류가 발생했습니다.');
  }
} 