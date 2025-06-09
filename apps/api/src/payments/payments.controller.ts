/**
 * 결제 API 컨트롤러
 * 
 * 결제 요청, 결제 승인, 결제 취소, 결제 이력 조회 등 REST API 엔드포인트를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  HttpCode,
  HttpStatus,
  RawBody,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './services/payment.service';

import {
  CreatePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  TossPaymentResponseDto,
  PaymentHistoryQueryDto,
  PaymentHistoryResponseDto,
  PaymentStatsDto
} from './dto/payment.dto';

@ApiTags('결제 관리')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 결제 요청 생성
   * 주문 기반으로 결제를 생성하고 결제창 정보를 반환합니다.
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '결제 요청 생성',
    description: '주문 기반으로 결제를 생성하고 토스페이먼츠 결제창 정보를 반환합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '결제 요청이 성공적으로 생성되었습니다.',
    example: {
      success: true,
      data: {
        paymentKey: 'payment_1234567890_abc123',
        checkoutUrl: 'https://api.tosspayments.com/v1/payments?clientKey=test_ck_...',
        orderId: 'ORDER_20241207_001',
        amount: 25000
      },
      message: '결제 요청이 성공적으로 생성되었습니다.'
    }
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터입니다.',
    example: {
      success: false,
      error: 'BAD_REQUEST',
      message: '결제 금액은 최소 100원 이상이어야 합니다.',
    }
  })
  @ApiResponse({
    status: 404,
    description: '주문을 찾을 수 없습니다.',
    example: {
      success: false,
      error: 'NOT_FOUND',
      message: '해당 주문을 찾을 수 없습니다.',
    }
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: '사용자 ID (임시 구현)',
    required: true,
    example: 'user_12345'
  })
  async createPayment(
    @Headers('X-User-ID') userId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<{
    success: boolean;
    data: {
      paymentKey: string;
      checkoutUrl: string;
      orderId: string;
      amount: number;
    };
    message: string;
  }> {
    try {
      this.logger.log(`Payment creation request: ${createPaymentDto.orderId} by user: ${userId}`);

      if (!userId) {
        throw new BadRequestException('사용자 인증이 필요합니다.');
      }

      const result = await this.paymentService.createPayment(createPaymentDto, userId);

      return {
        success: true,
        data: result,
        message: '결제 요청이 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment creation failed:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 요청 생성에 실패했습니다.');
    }
  }

  /**
   * 결제 승인 처리
   * 고객이 결제를 완료한 후 최종 승인을 진행합니다.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결제 승인 처리',
    description: '토스페이먼츠에서 결제 완료 후 최종 승인을 진행합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '결제 승인이 성공적으로 완료되었습니다.',
    type: TossPaymentResponseDto,
    example: {
      success: true,
      data: {
        version: '2022-11-16',
        paymentKey: 'payment_1234567890_abc123',
        type: 'NORMAL',
        orderId: 'ORDER_20241207_001',
        orderName: '치킨 2마리 + 콜라',
        mId: 'tvivarepublica',
        currency: 'KRW',
        method: '카드',
        totalAmount: 25000,
        balanceAmount: 25000,
        status: 'DONE',
        requestedAt: '2024-12-07T10:00:00+09:00',
        approvedAt: '2024-12-07T10:01:00+09:00'
      },
      message: '결제 승인이 성공적으로 완료되었습니다.'
    }
  })
  @ApiResponse({
    status: 400,
    description: '결제 승인에 실패했습니다.',
    example: {
      success: false,
      error: 'BAD_REQUEST',
      message: '결제 금액이 일치하지 않습니다.',
    }
  })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<{
    success: boolean;
    data: TossPaymentResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment confirmation request: ${confirmPaymentDto.paymentKey}`);

      const result = await this.paymentService.confirmPayment(confirmPaymentDto);

      return {
        success: true,
        data: result,
        message: '결제 승인이 성공적으로 완료되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment confirmation failed:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 승인에 실패했습니다.');
    }
  }

  /**
   * 결제 취소/환불 처리
   * 완료된 결제에 대해 취소를 진행합니다.
   */
  @Post(':paymentKey/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결제 취소/환불',
    description: '완료된 결제에 대해 전체 또는 부분 취소를 진행합니다.',
  })
  @ApiParam({
    name: 'paymentKey',
    description: '취소할 결제의 결제 키',
    example: 'payment_1234567890_abc123'
  })
  @ApiResponse({
    status: 200,
    description: '결제 취소가 성공적으로 처리되었습니다.',
    type: TossPaymentResponseDto,
    example: {
      success: true,
      data: {
        version: '2022-11-16',
        paymentKey: 'payment_1234567890_abc123',
        type: 'NORMAL',
        orderId: 'ORDER_20241207_001',
        orderName: '치킨 2마리 + 콜라',
        status: 'CANCELED',
        cancels: [
          {
            cancelAmount: 25000,
            cancelReason: '고객 요청',
            canceledAt: '2024-12-07T11:00:00+09:00'
          }
        ]
      },
      message: '결제 취소가 성공적으로 처리되었습니다.'
    }
  })
  @ApiResponse({
    status: 400,
    description: '취소할 수 없는 결제 상태입니다.',
    example: {
      success: false,
      error: 'BAD_REQUEST',
      message: '취소할 수 없는 결제 상태입니다.',
    }
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: '사용자 ID (권한 확인용)',
    required: true,
    example: 'user_12345'
  })
  async cancelPayment(
    @Headers('X-User-ID') userId: string,
    @Param('paymentKey') paymentKey: string,
    @Body() cancelPaymentDto: CancelPaymentDto,
  ): Promise<{
    success: boolean;
    data: TossPaymentResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment cancellation request: ${paymentKey} by user: ${userId}`);

      if (!userId) {
        throw new BadRequestException('사용자 인증이 필요합니다.');
      }

      // 사용자 권한 확인을 위해 결제 정보 조회
      await this.paymentService.getPayment(paymentKey, userId);

      const result = await this.paymentService.cancelPayment(paymentKey, cancelPaymentDto);

      return {
        success: true,
        data: result,
        message: '결제 취소가 성공적으로 처리되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment cancellation failed:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 취소에 실패했습니다.');
    }
  }

  /**
   * 결제 정보 조회
   * 결제 키로 결제 상세 정보를 조회합니다.
   */
  @Get(':paymentKey')
  @ApiOperation({
    summary: '결제 정보 조회',
    description: '결제 키로 결제 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'paymentKey',
    description: '조회할 결제의 결제 키',
    example: 'payment_1234567890_abc123'
  })
  @ApiResponse({
    status: 200,
    description: '결제 정보가 성공적으로 조회되었습니다.',
    type: TossPaymentResponseDto,
    example: {
      success: true,
      data: {
        version: '2022-11-16',
        paymentKey: 'payment_1234567890_abc123',
        type: 'NORMAL',
        orderId: 'ORDER_20241207_001',
        orderName: '치킨 2마리 + 콜라',
        mId: 'tvivarepublica',
        currency: 'KRW',
        method: '카드',
        totalAmount: 25000,
        balanceAmount: 25000,
        status: 'DONE',
        requestedAt: '2024-12-07T10:00:00+09:00',
        approvedAt: '2024-12-07T10:01:00+09:00'
      },
      message: '결제 정보가 성공적으로 조회되었습니다.'
    }
  })
  @ApiResponse({
    status: 404,
    description: '결제 정보를 찾을 수 없습니다.',
    example: {
      success: false,
      error: 'NOT_FOUND',
      message: '결제 정보를 찾을 수 없습니다.',
    }
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: '사용자 ID (권한 확인용, 선택사항)',
    required: false,
    example: 'user_12345'
  })
  async getPayment(
    @Headers('X-User-ID') userId: string,
    @Param('paymentKey') paymentKey: string,
  ): Promise<{
    success: boolean;
    data: TossPaymentResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment info request: ${paymentKey} by user: ${userId || 'anonymous'}`);

      const result = await this.paymentService.getPayment(paymentKey, userId);

      return {
        success: true,
        data: result,
        message: '결제 정보가 성공적으로 조회되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment info fetch failed:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 주문 ID로 결제 정보 조회
   * 주문 ID로 해당 주문의 결제 정보를 조회합니다.
   */
  @Get('order/:orderId')
  @ApiOperation({
    summary: '주문의 결제 정보 조회',
    description: '주문 ID로 해당 주문의 결제 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'orderId',
    description: '조회할 주문 ID',
    example: 'ORDER_20241207_001'
  })
  @ApiResponse({
    status: 200,
    description: '주문의 결제 정보가 성공적으로 조회되었습니다.',
    type: TossPaymentResponseDto,
    example: {
      success: true,
      data: {
        version: '2022-11-16',
        paymentKey: 'payment_1234567890_abc123',
        type: 'NORMAL',
        orderId: 'ORDER_20241207_001',
        orderName: '치킨 2마리 + 콜라',
        mId: 'tvivarepublica',
        currency: 'KRW',
        method: '카드',
        totalAmount: 25000,
        balanceAmount: 25000,
        status: 'DONE',
        requestedAt: '2024-12-07T10:00:00+09:00',
        approvedAt: '2024-12-07T10:01:00+09:00'
      },
      message: '주문의 결제 정보가 성공적으로 조회되었습니다.'
    }
  })
  @ApiResponse({
    status: 404,
    description: '주문의 결제 정보를 찾을 수 없습니다.',
    example: {
      success: false,
      error: 'NOT_FOUND',
      message: '주문의 결제 정보를 찾을 수 없습니다.',
    }
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: '사용자 ID (권한 확인용)',
    required: true,
    example: 'user_12345'
  })
  async getPaymentByOrderId(
    @Headers('X-User-ID') userId: string,
    @Param('orderId') orderId: string,
  ): Promise<{
    success: boolean;
    data: TossPaymentResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment info by order request: ${orderId} by user: ${userId}`);

      if (!userId) {
        throw new BadRequestException('사용자 인증이 필요합니다.');
      }

      const result = await this.paymentService.getPaymentByOrderId(orderId, userId);

      return {
        success: true,
        data: result,
        message: '주문의 결제 정보가 성공적으로 조회되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment info by order fetch failed:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문의 결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 결제 이력 조회
   * 사용자의 결제 이력을 조회합니다.
   */
  @Get('history/list')
  @ApiOperation({
    summary: '결제 이력 조회',
    description: '사용자의 결제 이력을 페이지네이션과 필터링 옵션으로 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호 (기본값: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 항목 수 (기본값: 20)',
    example: 20
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '결제 상태 필터',
    example: 'DONE'
  })
  @ApiQuery({
    name: 'method',
    required: false,
    description: '결제 방법 필터',
    example: '카드'
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '조회 시작 날짜 (YYYY-MM-DD)',
    example: '2024-12-01'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '조회 종료 날짜 (YYYY-MM-DD)',
    example: '2024-12-31'
  })
  @ApiResponse({
    status: 200,
    description: '결제 이력이 성공적으로 조회되었습니다.',
    type: PaymentHistoryResponseDto,
    example: {
      success: true,
      data: {
        payments: [
          {
            version: '2022-11-16',
            paymentKey: 'payment_1234567890_abc123',
            type: 'NORMAL',
            orderId: 'ORDER_20241207_001',
            orderName: '치킨 2마리 + 콜라',
            method: '카드',
            totalAmount: 25000,
            status: 'DONE',
            requestedAt: '2024-12-07T10:00:00+09:00',
            approvedAt: '2024-12-07T10:01:00+09:00'
          }
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1,
        limit: 20,
        hasNext: false,
        hasPrevious: false
      },
      message: '결제 이력이 성공적으로 조회되었습니다.'
    }
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: '사용자 ID',
    required: true,
    example: 'user_12345'
  })
  async getPaymentHistory(
    @Headers('X-User-ID') userId: string,
    @Query() queryDto: PaymentHistoryQueryDto,
  ): Promise<{
    success: boolean;
    data: PaymentHistoryResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment history request by user: ${userId}`);

      if (!userId) {
        throw new BadRequestException('사용자 인증이 필요합니다.');
      }

      const result = await this.paymentService.getPaymentHistory(queryDto, userId);

      return {
        success: true,
        data: result,
        message: '결제 이력이 성공적으로 조회되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment history fetch failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 이력 조회에 실패했습니다.');
    }
  }

  /**
   * 웹훅 처리
   * 토스페이먼츠에서 전송하는 웹훅을 처리합니다.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결제 웹훅 처리',
    description: '토스페이먼츠에서 전송하는 결제 이벤트 웹훅을 처리합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '웹훅이 성공적으로 처리되었습니다.',
    example: {
      success: true,
      message: '웹훅이 성공적으로 처리되었습니다.'
    }
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 웹훅 서명입니다.',
    example: {
      success: false,
      error: 'BAD_REQUEST',
      message: 'Invalid webhook signature',
    }
  })
  @ApiHeader({
    name: 'TossPayments-Signature',
    description: '토스페이먼츠 웹훅 서명',
    required: true,
  })
  async handleWebhook(
    @Headers('TossPayments-Signature') signature: string,
    @RawBody() rawBody: Buffer,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const payload = rawBody.toString('utf8');
      this.logger.log('Webhook received');

      if (!signature) {
        throw new BadRequestException('Webhook signature is required');
      }

      await this.paymentService.handleWebhook(signature, payload);

      return {
        success: true,
        message: '웹훅이 성공적으로 처리되었습니다.'
      };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('웹훅 처리에 실패했습니다.');
    }
  }

  /**
   * 결제 통계 조회 (관리자용)
   * 결제 통계를 조회합니다.
   */
  @Get('admin/stats')
  @ApiOperation({
    summary: '결제 통계 조회',
    description: '관리자용 결제 통계 정보를 조회합니다.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '조회 시작 날짜 (YYYY-MM-DD)',
    example: '2024-12-01'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '조회 종료 날짜 (YYYY-MM-DD)',
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '특정 사용자 ID (선택사항)',
    example: 'user_12345'
  })
  @ApiResponse({
    status: 200,
    description: '결제 통계가 성공적으로 조회되었습니다.',
    type: PaymentStatsDto,
    example: {
      success: true,
      data: {
        totalPayments: 100,
        successfulPayments: 95,
        failedPayments: 3,
        canceledPayments: 2,
        totalAmount: 2500000,
        averageAmount: 26315,
        successRate: 95.0,
        cardPaymentRate: 80.0,
        easyPayRate: 15.0,
        virtualAccountRate: 5.0
      },
      message: '결제 통계가 성공적으로 조회되었습니다.'
    }
  })
  @ApiHeader({
    name: 'X-Admin-Token',
    description: '관리자 인증 토큰 (임시 구현)',
    required: true,
    example: 'admin_token_12345'
  })
  async getPaymentStats(
    @Headers('X-Admin-Token') adminToken: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ): Promise<{
    success: boolean;
    data: PaymentStatsDto;
    message: string;
  }> {
    try {
      this.logger.log('Payment stats request by admin');

      // 관리자 권한 확인 (임시 구현)
      if (!adminToken || adminToken !== 'admin_token_12345') {
        throw new BadRequestException('관리자 권한이 필요합니다.');
      }

      const result = await this.paymentService.getPaymentStats(startDate, endDate, userId);

      return {
        success: true,
        data: result,
        message: '결제 통계가 성공적으로 조회되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment stats fetch failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 결제 상태 동기화
   * 토스페이먼츠와 로컬 데이터베이스 상태를 동기화합니다.
   */
  @Put(':paymentKey/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결제 상태 동기화',
    description: '토스페이먼츠의 실제 상태와 로컬 데이터베이스 상태를 동기화합니다.',
  })
  @ApiParam({
    name: 'paymentKey',
    description: '동기화할 결제의 결제 키',
    example: 'payment_1234567890_abc123'
  })
  @ApiResponse({
    status: 200,
    description: '결제 상태가 성공적으로 동기화되었습니다.',
    type: TossPaymentResponseDto,
    example: {
      success: true,
      data: {
        version: '2022-11-16',
        paymentKey: 'payment_1234567890_abc123',
        type: 'NORMAL',
        orderId: 'ORDER_20241207_001',
        orderName: '치킨 2마리 + 콜라',
        status: 'DONE',
        method: '카드',
        totalAmount: 25000,
        requestedAt: '2024-12-07T10:00:00+09:00',
        approvedAt: '2024-12-07T10:01:00+09:00'
      },
      message: '결제 상태가 성공적으로 동기화되었습니다.'
    }
  })
  @ApiResponse({
    status: 404,
    description: '결제 정보를 찾을 수 없습니다.',
    example: {
      success: false,
      error: 'NOT_FOUND',
      message: '결제 정보를 찾을 수 없습니다.',
    }
  })
  @ApiHeader({
    name: 'X-Admin-Token',
    description: '관리자 인증 토큰 (임시 구현)',
    required: true,
    example: 'admin_token_12345'
  })
  async syncPaymentStatus(
    @Headers('X-Admin-Token') adminToken: string,
    @Param('paymentKey') paymentKey: string,
  ): Promise<{
    success: boolean;
    data: TossPaymentResponseDto;
    message: string;
  }> {
    try {
      this.logger.log(`Payment sync request: ${paymentKey}`);

      // 관리자 권한 확인 (임시 구현)
      if (!adminToken || adminToken !== 'admin_token_12345') {
        throw new BadRequestException('관리자 권한이 필요합니다.');
      }

      const result = await this.paymentService.getPayment(paymentKey);

      return {
        success: true,
        data: result,
        message: '결제 상태가 성공적으로 동기화되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment sync failed:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 상태 동기화에 실패했습니다.');
    }
  }

  /**
   * 결제 방법별 통계 조회
   * 결제 방법별 상세 통계를 조회합니다.
   */
  @Get('admin/stats/methods')
  @ApiOperation({
    summary: '결제 방법별 통계 조회',
    description: '관리자용 결제 방법별 상세 통계를 조회합니다.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '조회 시작 날짜 (YYYY-MM-DD)',
    example: '2024-12-01'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '조회 종료 날짜 (YYYY-MM-DD)',
    example: '2024-12-31'
  })
  @ApiResponse({
    status: 200,
    description: '결제 방법별 통계가 성공적으로 조회되었습니다.',
    example: {
      success: true,
      data: {
        methods: [
          {
            method: '카드',
            count: 80,
            totalAmount: 2000000,
            percentage: 80.0,
            averageAmount: 25000
          },
          {
            method: '간편결제',
            count: 15,
            totalAmount: 375000,
            percentage: 15.0,
            averageAmount: 25000
          },
          {
            method: '가상계좌',
            count: 5,
            totalAmount: 125000,
            percentage: 5.0,
            averageAmount: 25000
          }
        ],
        totalPayments: 100,
        totalAmount: 2500000
      },
      message: '결제 방법별 통계가 성공적으로 조회되었습니다.'
    }
  })
  @ApiHeader({
    name: 'X-Admin-Token',
    description: '관리자 인증 토큰 (임시 구현)',
    required: true,
    example: 'admin_token_12345'
  })
  async getPaymentMethodStats(
    @Headers('X-Admin-Token') adminToken: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    try {
      this.logger.log('Payment method stats request by admin');

      // 관리자 권한 확인 (임시 구현)
      if (!adminToken || adminToken !== 'admin_token_12345') {
        throw new BadRequestException('관리자 권한이 필요합니다.');
      }

      // 기본 통계에서 방법별 데이터 추출
      const baseStats = await this.paymentService.getPaymentStats(startDate, endDate);

      const methodStats = {
        methods: [
          {
            method: '카드',
            count: Math.round(baseStats.totalPayments * (baseStats.cardPaymentRate / 100)),
            totalAmount: Math.round(baseStats.totalAmount * (baseStats.cardPaymentRate / 100)),
            percentage: baseStats.cardPaymentRate,
            averageAmount: baseStats.averageAmount
          },
          {
            method: '간편결제',
            count: Math.round(baseStats.totalPayments * (baseStats.easyPayRate / 100)),
            totalAmount: Math.round(baseStats.totalAmount * (baseStats.easyPayRate / 100)),
            percentage: baseStats.easyPayRate,
            averageAmount: baseStats.averageAmount
          },
          {
            method: '가상계좌',
            count: Math.round(baseStats.totalPayments * (baseStats.virtualAccountRate / 100)),
            totalAmount: Math.round(baseStats.totalAmount * (baseStats.virtualAccountRate / 100)),
            percentage: baseStats.virtualAccountRate,
            averageAmount: baseStats.averageAmount
          }
        ],
        totalPayments: baseStats.totalPayments,
        totalAmount: baseStats.totalAmount
      };

      return {
        success: true,
        data: methodStats,
        message: '결제 방법별 통계가 성공적으로 조회되었습니다.'
      };
    } catch (error) {
      this.logger.error('Payment method stats fetch failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 방법별 통계 조회에 실패했습니다.');
    }
  }
} 