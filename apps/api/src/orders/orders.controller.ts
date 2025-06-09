/**
 * 주문 컨트롤러
 * 
 * 주문 생성, 조회, 상태 변경 등의 REST API 엔드포인트를 제공합니다.
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
  HttpCode, 
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { OrderService } from './services/order.service';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderListQueryDto,
  OrderListResponseDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderStatsDto
} from './dto/order.dto';

/**
 * 주문 관리 API 컨트롤러
 */
@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 새 주문 생성
   * 장바구니 데이터를 기반으로 주문을 생성합니다.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: '주문 생성',
    description: '장바구니 데이터를 기반으로 새 주문을 생성합니다. 결제 대기 상태로 시작됩니다.'
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ 
    status: 201, 
    description: '주문이 성공적으로 생성되었습니다.',
    type: OrderResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청 데이터입니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '레스토랑 ID는 필수입니다.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '레스토랑을 찾을 수 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: '레스토랑을 찾을 수 없습니다.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: any
  ): Promise<OrderResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'] || 'anonymous_user';
    
    if (!userId || userId === 'anonymous_user') {
      throw new BadRequestException('로그인이 필요합니다.');
    }

    return await this.orderService.createOrder(createOrderDto, userId);
  }

  /**
   * 주문 목록 조회
   * 사용자의 주문 목록을 페이지네이션으로 조회합니다.
   */
  @Get()
  @ApiOperation({ 
    summary: '주문 목록 조회',
    description: '사용자의 주문 목록을 페이지네이션과 필터링 옵션으로 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 아이템 수 (기본값: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'payment_confirmed', 'accepted', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'refunded'], description: '주문 상태 필터' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'restaurantId', required: false, type: String, description: '레스토랑 ID 필터' })
  @ApiResponse({ 
    status: 200, 
    description: '주문 목록 조회 성공',
    type: OrderListResponseDto
  })
  async getOrders(
    @Query() queryDto: OrderListQueryDto,
    @Request() req: any
  ): Promise<OrderListResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    return await this.orderService.getOrders(queryDto, userId);
  }

  /**
   * 주문 상세 조회
   * 특정 주문의 상세 정보를 조회합니다.
   */
  @Get(':orderId')
  @ApiOperation({ 
    summary: '주문 상세 조회',
    description: '주문 ID로 특정 주문의 상세 정보를 조회합니다.'
  })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'order_123' })
  @ApiResponse({ 
    status: 200, 
    description: '주문 상세 조회 성공',
    type: OrderResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: '주문을 찾을 수 없습니다.' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  async getOrderById(
    @Param('orderId') orderId: string,
    @Request() req: any
  ): Promise<OrderResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    return await this.orderService.getOrderById(orderId, userId);
  }

  /**
   * 주문 상태 변경
   * 주문의 상태를 변경합니다. (레스토랑 관리자 또는 배달원용)
   */
  @Put(':orderId/status')
  @ApiOperation({ 
    summary: '주문 상태 변경',
    description: '주문의 상태를 변경합니다. 레스토랑 관리자나 배달원이 사용합니다.'
  })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'order_123' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({ 
    status: 200, 
    description: '주문 상태 변경 성공',
    type: OrderResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 상태 전환입니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'pending에서 delivered로 상태 변경할 수 없습니다.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없습니다.'
  })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req: any
  ): Promise<OrderResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const updatedBy = req.headers['x-user-id'] || 'system';
    
    return await this.orderService.updateOrderStatus(orderId, updateStatusDto, updatedBy);
  }

  /**
   * 주문 취소
   * 고객이 주문을 취소합니다.
   */
  @Post(':orderId/cancel')
  @ApiOperation({ 
    summary: '주문 취소',
    description: '고객이 주문을 취소합니다. 특정 상태에서만 취소 가능합니다.'
  })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'order_123' })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({ 
    status: 200, 
    description: '주문 취소 성공',
    type: OrderResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: '현재 상태에서는 주문을 취소할 수 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '현재 상태에서는 주문을 취소할 수 없습니다.' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없습니다.'
  })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() cancelOrderDto: CancelOrderDto,
    @Request() req: any
  ): Promise<OrderResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      throw new BadRequestException('로그인이 필요합니다.');
    }
    
    return await this.orderService.cancelOrder(orderId, cancelOrderDto, userId);
  }

  /**
   * 주문 재주문
   * 이전 주문을 기반으로 새 주문을 생성합니다.
   */
  @Post(':orderId/reorder')
  @ApiOperation({ 
    summary: '주문 재주문',
    description: '이전 주문을 기반으로 새 주문을 생성합니다.'
  })
  @ApiParam({ name: 'orderId', description: '기존 주문 ID', example: 'order_123' })
  @ApiResponse({ 
    status: 201, 
    description: '재주문 성공',
    type: OrderResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: '기존 주문을 찾을 수 없습니다.'
  })
  async reorderOrder(
    @Param('orderId') orderId: string,
    @Request() req: any
  ): Promise<OrderResponseDto> {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      throw new BadRequestException('로그인이 필요합니다.');
    }

    // 기존 주문 정보 조회
    const existingOrder = await this.orderService.getOrderById(orderId, userId);
    
    // 재주문 DTO 생성
    const reorderDto: CreateOrderDto = {
      restaurantId: existingOrder.restaurant.id,
      items: existingOrder.items,
      deliveryType: existingOrder.delivery.type,
      deliveryAddress: existingOrder.delivery.address,
      paymentMethod: existingOrder.payment.method,
      orderNotes: '재주문'
    };
    
    return await this.orderService.createOrder(reorderDto, userId);
  }

  /**
   * 주문 영수증 조회
   * 주문의 상세 영수증 정보를 조회합니다.
   */
  @Get(':orderId/receipt')
  @ApiOperation({ 
    summary: '주문 영수증 조회',
    description: '주문의 상세 영수증 정보를 조회합니다.'
  })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'order_123' })
  @ApiResponse({ 
    status: 200, 
    description: '영수증 조회 성공',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', example: 'order_123' },
        orderNumber: { type: 'string', example: 'ORD-20240115-001' },
        restaurant: { 
          type: 'object',
          properties: {
            name: { type: 'string', example: '맛있는 치킨집' },
            address: { type: 'string', example: '서울특별시 강남구 테헤란로 456' },
            phone: { type: 'string', example: '02-1234-5678' }
          }
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menuName: { type: 'string', example: '후라이드 치킨' },
              quantity: { type: 'number', example: 2 },
              totalPrice: { type: 'number', example: 40000 }
            }
          }
        },
        pricing: {
          type: 'object',
          properties: {
            subtotal: { type: 'number', example: 38000 },
            deliveryFee: { type: 'number', example: 3000 },
            serviceFee: { type: 'number', example: 500 },
            tax: { type: 'number', example: 1000 },
            totalAmount: { type: 'number', example: 42500 }
          }
        },
        createdAt: { type: 'string', example: '2024-01-15T14:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없습니다.'
  })
  async getOrderReceipt(
    @Param('orderId') orderId: string,
    @Request() req: any
  ) {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    const order = await this.orderService.getOrderById(orderId, userId);
    
    // 영수증 형태로 데이터 변환
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        phone: order.restaurant.phone
      },
      items: order.items.map(item => ({
        menuName: item.menuName,
        quantity: item.quantity,
        basePrice: item.basePrice,
        optionsPrice: item.optionsPrice,
        totalPrice: item.totalPrice,
        selectedOptions: item.selectedOptions
      })),
      pricing: order.pricing,
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        paidAt: order.payment.paidAt
      },
      createdAt: order.createdAt
    };
  }

  /**
   * 주문 추적 정보 조회
   * 주문의 실시간 추적 정보를 조회합니다.
   */
  @Get(':orderId/tracking')
  @ApiOperation({ 
    summary: '주문 추적 정보 조회',
    description: '주문의 실시간 추적 정보를 조회합니다.'
  })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'order_123' })
  @ApiResponse({ 
    status: 200, 
    description: '추적 정보 조회 성공',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', example: 'order_123' },
        status: { type: 'string', example: 'dispatched' },
        estimatedDeliveryTime: { type: 'string', example: '2024-01-15T15:30:00.000Z' },
        driver: {
          type: 'object',
          properties: {
            name: { type: 'string', example: '김배달' },
            phone: { type: 'string', example: '010-1234-5678' }
          }
        },
        timeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'accepted' },
              timestamp: { type: 'string', example: '2024-01-15T14:05:00.000Z' },
              description: { type: 'string', example: '레스토랑에서 주문을 승인했습니다.' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '주문을 찾을 수 없습니다.'
  })
  async getOrderTracking(
    @Param('orderId') orderId: string,
    @Request() req: any
  ) {
    // 임시로 사용자 ID를 헤더에서 추출 (향후 JWT 토큰에서 추출)
    const userId = req.headers['x-user-id'];
    
    const order = await this.orderService.getOrderById(orderId, userId);
    
    // 추적 정보 형태로 데이터 변환
    const timeline = [];
    
    // 주문 생성
    timeline.push({
      status: 'pending',
      timestamp: order.createdAt,
      description: '주문이 접수되었습니다.'
    });
    
    // 상태별 타임라인 생성 (실제로는 order_status_history 테이블에서 조회)
    if (order.status !== 'pending') {
      timeline.push({
        status: 'payment_confirmed',
        timestamp: order.createdAt, // 실제로는 결제 확인 시간
        description: '결제가 확인되었습니다.'
      });
    }
    
    if (['accepted', 'preparing', 'ready', 'dispatched', 'delivered'].includes(order.status)) {
      timeline.push({
        status: 'accepted',
        timestamp: order.createdAt, // 실제로는 승인 시간
        description: '레스토랑에서 주문을 승인했습니다.'
      });
    }
    
    if (['preparing', 'ready', 'dispatched', 'delivered'].includes(order.status)) {
      timeline.push({
        status: 'preparing',
        timestamp: order.createdAt, // 실제로는 조리 시작 시간
        description: '음식 조리를 시작했습니다.'
      });
    }
    
    if (['ready', 'dispatched', 'delivered'].includes(order.status)) {
      timeline.push({
        status: 'ready',
        timestamp: order.createdAt, // 실제로는 조리 완료 시간
        description: '음식 조리가 완료되었습니다.'
      });
    }
    
    if (['dispatched', 'delivered'].includes(order.status)) {
      timeline.push({
        status: 'dispatched',
        timestamp: order.delivery.dispatchedAt || order.createdAt,
        description: '배달이 시작되었습니다.'
      });
    }
    
    if (order.status === 'delivered') {
      timeline.push({
        status: 'delivered',
        timestamp: order.delivery.deliveredAt || order.createdAt,
        description: '배달이 완료되었습니다.'
      });
    }
    
    return {
      orderId: order.id,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      driver: order.delivery.driverId ? {
        name: order.delivery.driverName,
        phone: order.delivery.driverPhone
      } : null,
      timeline
    };
  }

  /**
   * 관리자용 주문 통계 조회
   * 주문 관련 통계 정보를 조회합니다.
   */
  @Get('admin/stats')
  @ApiOperation({ 
    summary: '주문 통계 조회 (관리자용)',
    description: '주문 관련 통계 정보를 조회합니다. 관리자 권한이 필요합니다.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '종료 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'restaurantId', required: false, type: String, description: '레스토랑 ID 필터' })
  @ApiResponse({ 
    status: 200, 
    description: '통계 조회 성공',
    type: OrderStatsDto
  })
  async getOrderStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('restaurantId') restaurantId?: string
  ): Promise<OrderStatsDto> {
    // 실제로는 별도의 통계 서비스에서 처리
    // 여기서는 기본 구조만 제공
    return {
      totalOrders: 1250,
      completedOrders: 1100,
      cancelledOrders: 150,
      averageOrderValue: 32000,
      totalRevenue: 40000000,
      completionRate: 88.0,
      averageDeliveryTime: 28
    };
  }
} 