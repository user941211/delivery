/**
 * 간편결제 연동 컨트롤러
 * 
 * 카카오페이, 토스페이, 네이버페이 등 PG사와의 연동 API를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PaymentGatewayService } from '../services/payment-gateway.service';

import {
  PaymentGatewayRequestDto,
  PaymentGatewayResponseDto,
  KakaoPayRequestDto,
  TossPaymentRequestDto,
  NaverPayRequestDto,
  PaymentCancelRequestDto,
  PaymentStatusResponseDto,
  PaymentWebhookDto,
  RecurringPaymentRequestDto,
  RecurringPaymentExecuteDto,
  PaymentGateway,
  PaymentGatewayStatus
} from '../dto/payment-gateway.dto';

/**
 * 임시 인증 요청 인터페이스 (실제로는 JWT에서 추출)
 */
interface AuthenticatedRequest {
  user: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * 간편결제 연동 컨트롤러 클래스
 */
@ApiTags('Payment Gateway')
@Controller('payment-gateway')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly paymentGatewayService: PaymentGatewayService
  ) {}

  /**
   * 결제 요청
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '간편결제 요청' })
  @ApiResponse({
    status: 201,
    description: '결제 요청이 성공적으로 처리되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 500, description: 'PG사 연동 오류입니다.' })
  async initiatePayment(
    @Body() paymentRequest: PaymentGatewayRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentGatewayResponseDto> {
    try {
      this.logger.log(`Payment initiation request for gateway: ${paymentRequest.gateway}`);
      
      // 요청에 구매자 정보 추가
      const enrichedRequest = {
        ...paymentRequest,
        buyerId: req.user?.id || paymentRequest.buyerId,
        buyerName: req.user?.name || paymentRequest.buyerName
      };

      return await this.paymentGatewayService.initiatePayment(enrichedRequest);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Payment initiation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 카카오페이 결제 요청
   */
  @Post('payments/kakaopay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '카카오페이 결제 요청' })
  @ApiResponse({
    status: 201,
    description: '카카오페이 결제 요청이 성공적으로 처리되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  async initiateKakaoPayment(
    @Body() paymentRequest: KakaoPayRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentGatewayResponseDto> {
    const enrichedRequest = {
      ...paymentRequest,
      gateway: PaymentGateway.KAKAOPAY,
      buyerId: req.user?.id || paymentRequest.buyerId,
      buyerName: req.user?.name || paymentRequest.buyerName
    };

    return await this.paymentGatewayService.initiatePayment(enrichedRequest);
  }

  /**
   * 토스 결제 요청
   */
  @Post('payments/toss')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '토스 결제 요청' })
  @ApiResponse({
    status: 201,
    description: '토스 결제 요청이 성공적으로 처리되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  async initiateTossPayment(
    @Body() paymentRequest: TossPaymentRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentGatewayResponseDto> {
    const enrichedRequest = {
      ...paymentRequest,
      gateway: PaymentGateway.TOSS,
      buyerId: req.user?.id || paymentRequest.buyerId,
      buyerName: req.user?.name || paymentRequest.buyerName
    };

    return await this.paymentGatewayService.initiatePayment(enrichedRequest);
  }

  /**
   * 네이버페이 결제 요청
   */
  @Post('payments/naverpay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '네이버페이 결제 요청' })
  @ApiResponse({
    status: 201,
    description: '네이버페이 결제 요청이 성공적으로 처리되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  async initiateNaverPayment(
    @Body() paymentRequest: NaverPayRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentGatewayResponseDto> {
    const enrichedRequest = {
      ...paymentRequest,
      gateway: PaymentGateway.NAVERPAY,
      buyerId: req.user?.id || paymentRequest.buyerId,
      buyerName: req.user?.name || paymentRequest.buyerName
    };

    return await this.paymentGatewayService.initiatePayment(enrichedRequest);
  }

  /**
   * 결제 승인 처리
   */
  @Post('payments/:paymentId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '결제 승인 처리' })
  @ApiParam({ name: 'paymentId', description: '결제 ID' })
  @ApiResponse({
    status: 200,
    description: '결제가 성공적으로 승인되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async approvePayment(
    @Param('paymentId') paymentId: string,
    @Body() approvalData: any
  ): Promise<PaymentGatewayResponseDto> {
    return await this.paymentGatewayService.approvePayment(paymentId, approvalData);
  }

  /**
   * 결제 취소/환불
   */
  @Post('payments/:paymentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '결제 취소/환불' })
  @ApiParam({ name: 'paymentId', description: '결제 ID' })
  @ApiResponse({
    status: 200,
    description: '결제가 성공적으로 취소되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async cancelPayment(
    @Param('paymentId') paymentId: string,
    @Body() cancelRequest: Omit<PaymentCancelRequestDto, 'paymentId'>
  ): Promise<PaymentGatewayResponseDto> {
    const fullCancelRequest = { ...cancelRequest, paymentId };
    return await this.paymentGatewayService.cancelPayment(fullCancelRequest);
  }

  /**
   * 결제 상태 조회
   */
  @Get('payments/:paymentId/status')
  @ApiOperation({ summary: '결제 상태 조회' })
  @ApiParam({ name: 'paymentId', description: '결제 ID' })
  @ApiResponse({
    status: 200,
    description: '결제 상태가 성공적으로 조회되었습니다.',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async getPaymentStatus(
    @Param('paymentId') paymentId: string
  ): Promise<PaymentStatusResponseDto> {
    return await this.paymentGatewayService.getPaymentStatus(paymentId);
  }

  /**
   * 카카오페이 웹훅
   */
  @Post('webhooks/kakaopay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '카카오페이 웹훅 처리' })
  @ApiHeader({ name: 'X-Kakao-Signature', description: '카카오페이 서명', required: false })
  @ApiResponse({ status: 200, description: '웹훅이 성공적으로 처리되었습니다.' })
  async handleKakaoPayWebhook(
    @Body() webhookData: any,
    @Headers('X-Kakao-Signature') signature?: string
  ): Promise<{ success: boolean }> {
    try {
      const processedWebhookData: PaymentWebhookDto = {
        eventType: webhookData.eventType || 'payment',
        paymentId: webhookData.tid,
        orderId: webhookData.partner_order_id,
        status: this.mapKakaoPayStatus(webhookData.status),
        amount: webhookData.amount?.total || 0,
        gateway: PaymentGateway.KAKAOPAY,
        timestamp: new Date().toISOString(),
        signature,
        data: webhookData
      };

      await this.paymentGatewayService.handleWebhook(processedWebhookData);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`KakaoPay webhook processing failed: ${errorMessage}`);
      throw new BadRequestException('웹훅 처리에 실패했습니다.');
    }
  }

  /**
   * 토스 웹훅
   */
  @Post('webhooks/toss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토스 웹훅 처리' })
  @ApiHeader({ name: 'X-Toss-Signature', description: '토스 서명', required: false })
  @ApiResponse({ status: 200, description: '웹훅이 성공적으로 처리되었습니다.' })
  async handleTossWebhook(
    @Body() webhookData: any,
    @Headers('X-Toss-Signature') signature?: string
  ): Promise<{ success: boolean }> {
    try {
      const processedWebhookData: PaymentWebhookDto = {
        eventType: webhookData.eventType || 'payment',
        paymentId: webhookData.paymentKey,
        orderId: webhookData.orderId,
        status: this.mapTossStatus(webhookData.status),
        amount: webhookData.totalAmount || 0,
        gateway: PaymentGateway.TOSS,
        timestamp: new Date().toISOString(),
        signature,
        data: webhookData
      };

      await this.paymentGatewayService.handleWebhook(processedWebhookData);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Toss webhook processing failed: ${errorMessage}`);
      throw new BadRequestException('웹훅 처리에 실패했습니다.');
    }
  }

  /**
   * 네이버페이 웹훅
   */
  @Post('webhooks/naverpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '네이버페이 웹훅 처리' })
  @ApiHeader({ name: 'X-Naver-Signature', description: '네이버페이 서명', required: false })
  @ApiResponse({ status: 200, description: '웹훅이 성공적으로 처리되었습니다.' })
  async handleNaverPayWebhook(
    @Body() webhookData: any,
    @Headers('X-Naver-Signature') signature?: string
  ): Promise<{ success: boolean }> {
    try {
      const processedWebhookData: PaymentWebhookDto = {
        eventType: webhookData.eventType || 'payment',
        paymentId: webhookData.paymentId,
        orderId: webhookData.merchantPayKey,
        status: this.mapNaverPayStatus(webhookData.detailType),
        amount: webhookData.totalPayAmount || 0,
        gateway: PaymentGateway.NAVERPAY,
        timestamp: new Date().toISOString(),
        signature,
        data: webhookData
      };

      await this.paymentGatewayService.handleWebhook(processedWebhookData);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`NaverPay webhook processing failed: ${errorMessage}`);
      throw new BadRequestException('웹훅 처리에 실패했습니다.');
    }
  }

  /**
   * 정기결제 등록
   */
  @Post('recurring/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '정기결제 등록' })
  @ApiResponse({
    status: 201,
    description: '정기결제가 성공적으로 등록되었습니다.',
  })
  async registerRecurringPayment(
    @Body() recurringRequest: RecurringPaymentRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ billingKey: string; status: string }> {
    // 정기결제 등록 로직 (구현 필요)
    return {
      billingKey: 'billing_key_' + Date.now(),
      status: 'registered'
    };
  }

  /**
   * 정기결제 실행
   */
  @Post('recurring/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '정기결제 실행' })
  @ApiResponse({
    status: 200,
    description: '정기결제가 성공적으로 실행되었습니다.',
    type: PaymentGatewayResponseDto,
  })
  async executeRecurringPayment(
    @Body() executeRequest: RecurringPaymentExecuteDto
  ): Promise<PaymentGatewayResponseDto> {
    // 정기결제 실행 로직 (구현 필요)
    throw new BadRequestException('정기결제 기능은 아직 구현되지 않았습니다.');
  }

  /**
   * 결제 성공 리다이렉트 처리
   */
  @Get('success')
  @ApiOperation({ summary: '결제 성공 페이지' })
  @ApiQuery({ name: 'paymentId', description: '결제 ID', required: false })
  @ApiQuery({ name: 'orderId', description: '주문 ID', required: false })
  @ApiResponse({ status: 200, description: '결제 성공 페이지입니다.' })
  async paymentSuccess(
    @Query('paymentId') paymentId?: string,
    @Query('orderId') orderId?: string,
    @Query() allQuery?: any
  ): Promise<{ message: string; paymentId?: string; orderId?: string; data?: any }> {
    this.logger.log(`Payment success redirect: paymentId=${paymentId}, orderId=${orderId}`);
    
    return {
      message: '결제가 성공적으로 완료되었습니다.',
      paymentId,
      orderId,
      data: allQuery
    };
  }

  /**
   * 결제 실패 리다이렉트 처리
   */
  @Get('fail')
  @ApiOperation({ summary: '결제 실패 페이지' })
  @ApiQuery({ name: 'paymentId', description: '결제 ID', required: false })
  @ApiQuery({ name: 'orderId', description: '주문 ID', required: false })
  @ApiQuery({ name: 'errorCode', description: '오류 코드', required: false })
  @ApiQuery({ name: 'errorMessage', description: '오류 메시지', required: false })
  @ApiResponse({ status: 200, description: '결제 실패 페이지입니다.' })
  async paymentFail(
    @Query('paymentId') paymentId?: string,
    @Query('orderId') orderId?: string,
    @Query('errorCode') errorCode?: string,
    @Query('errorMessage') errorMessage?: string,
    @Query() allQuery?: any
  ): Promise<{ message: string; error?: any; data?: any }> {
    this.logger.warn(`Payment failed: paymentId=${paymentId}, orderId=${orderId}, error=${errorCode}: ${errorMessage}`);
    
    return {
      message: '결제에 실패했습니다.',
      error: {
        code: errorCode,
        message: errorMessage,
        paymentId,
        orderId
      },
      data: allQuery
    };
  }

  /**
   * 결제 취소 리다이렉트 처리
   */
  @Get('cancel')
  @ApiOperation({ summary: '결제 취소 페이지' })
  @ApiQuery({ name: 'paymentId', description: '결제 ID', required: false })
  @ApiQuery({ name: 'orderId', description: '주문 ID', required: false })
  @ApiResponse({ status: 200, description: '결제 취소 페이지입니다.' })
  async paymentCancel(
    @Query('paymentId') paymentId?: string,
    @Query('orderId') orderId?: string,
    @Query() allQuery?: any
  ): Promise<{ message: string; paymentId?: string; orderId?: string; data?: any }> {
    this.logger.log(`Payment cancelled: paymentId=${paymentId}, orderId=${orderId}`);
    
    return {
      message: '결제가 취소되었습니다.',
      paymentId,
      orderId,
      data: allQuery
    };
  }

  /**
   * 내부 메서드들
   */

  /**
   * 카카오페이 상태 매핑
   */
  private mapKakaoPayStatus(status: string): PaymentGatewayStatus {
    switch (status) {
      case 'READY': return PaymentGatewayStatus.READY;
      case 'SEND_TMS': return PaymentGatewayStatus.PENDING;
      case 'OPEN_PAYMENT': return PaymentGatewayStatus.PENDING;
      case 'SELECT_METHOD': return PaymentGatewayStatus.PENDING;
      case 'ARS_WAITING': return PaymentGatewayStatus.PENDING;
      case 'AUTH_PASSWORD': return PaymentGatewayStatus.PENDING;
      case 'SUCCESS_PAYMENT': return PaymentGatewayStatus.APPROVED;
      case 'PART_CANCEL_PAYMENT': return PaymentGatewayStatus.PARTIAL_CANCELLED;
      case 'CANCEL_PAYMENT': return PaymentGatewayStatus.CANCELLED;
      case 'FAIL_AUTH_PASSWORD': return PaymentGatewayStatus.FAILED;
      case 'QUIT_PAYMENT': return PaymentGatewayStatus.CANCELLED;
      case 'FAIL_PAYMENT': return PaymentGatewayStatus.FAILED;
      default: return PaymentGatewayStatus.PENDING;
    }
  }

  /**
   * 토스 상태 매핑
   */
  private mapTossStatus(status: string): PaymentGatewayStatus {
    switch (status) {
      case 'READY': return PaymentGatewayStatus.READY;
      case 'IN_PROGRESS': return PaymentGatewayStatus.PENDING;
      case 'WAITING_FOR_DEPOSIT': return PaymentGatewayStatus.PENDING;
      case 'DONE': return PaymentGatewayStatus.APPROVED;
      case 'CANCELED': return PaymentGatewayStatus.CANCELLED;
      case 'PARTIAL_CANCELED': return PaymentGatewayStatus.PARTIAL_CANCELLED;
      case 'ABORTED': return PaymentGatewayStatus.FAILED;
      case 'EXPIRED': return PaymentGatewayStatus.FAILED;
      default: return PaymentGatewayStatus.PENDING;
    }
  }

  /**
   * 네이버페이 상태 매핑
   */
  private mapNaverPayStatus(detailType: string): PaymentGatewayStatus {
    switch (detailType) {
      case 'APPROVAL': return PaymentGatewayStatus.APPROVED;
      case 'CANCEL': return PaymentGatewayStatus.CANCELLED;
      case 'REFUND': return PaymentGatewayStatus.REFUNDED;
      default: return PaymentGatewayStatus.PENDING;
    }
  }
} 