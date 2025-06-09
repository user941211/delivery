/**
 * 부분 환불 및 취소 시스템 컨트롤러
 * 
 * 환불 요청 처리, 상태 관리, 통계 조회 API를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { RefundService } from '../services/refund.service';

import {
  CreateRefundDto,
  RefundResponseDto,
  GetRefundsQueryDto,
  UpdateRefundStatusDto,
  CheckRefundEligibilityDto,
  RefundEligibilityResponseDto,
  RefundStatsDto,
  AutoRefundConfigDto,
  RefundStatus,
  RefundType,
  RefundReason
} from '../dto/refund.dto';

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
 * 환불 시스템 컨트롤러 클래스
 */
@ApiTags('Refunds')
@Controller('refunds')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class RefundController {
  private readonly logger = new Logger(RefundController.name);

  constructor(
    private readonly refundService: RefundService
  ) {}

  /**
   * 환불 요청 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '환불 요청 생성' })
  @ApiResponse({
    status: 201,
    description: '환불 요청이 성공적으로 생성되었습니다.',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없습니다.' })
  async createRefund(
    @Body() createRefundDto: CreateRefundDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Creating refund for order: ${createRefundDto.orderId}`);
      
      // 요청자 정보 추가
      if (req?.user?.id) {
        createRefundDto.requestedBy = req.user.id;
      }

      return await this.refundService.createRefund(createRefundDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '환불 목록 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'status', description: '환불 상태', enum: RefundStatus, required: false })
  @ApiQuery({ name: 'type', description: '환불 타입', enum: RefundType, required: false })
  @ApiQuery({ name: 'reason', description: '환불 사유', enum: RefundReason, required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiQuery({ name: 'minAmount', description: '최소 환불 금액', required: false })
  @ApiQuery({ name: 'maxAmount', description: '최대 환불 금액', required: false })
  @ApiQuery({ name: 'customerId', description: '고객 ID', required: false })
  @ApiQuery({ name: 'restaurantId', description: '가게 ID', required: false })
  @ApiResponse({
    status: 200,
    description: '환불 목록이 성공적으로 조회되었습니다.',
  })
  async getRefunds(
    @Query() query: GetRefundsQueryDto
  ): Promise<{ 
    refunds: RefundResponseDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    const result = await this.refundService.getRefunds(query);
    const totalPages = Math.ceil(result.total / (query.limit || 20));
    
    return {
      ...result,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages
    };
  }

  /**
   * 환불 상세 조회
   */
  @Get(':refundId')
  @ApiOperation({ summary: '환불 상세 조회' })
  @ApiParam({ name: 'refundId', description: '환불 ID' })
  @ApiResponse({
    status: 200,
    description: '환불 정보가 성공적으로 조회되었습니다.',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 404, description: '환불 내역을 찾을 수 없습니다.' })
  async getRefund(
    @Param('refundId') refundId: string
  ): Promise<RefundResponseDto> {
    return await this.refundService.getRefundById(refundId);
  }

  /**
   * 환불 상태 업데이트
   */
  @Put(':refundId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 상태 업데이트' })
  @ApiParam({ name: 'refundId', description: '환불 ID' })
  @ApiResponse({
    status: 200,
    description: '환불 상태가 성공적으로 업데이트되었습니다.',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 404, description: '환불 내역을 찾을 수 없습니다.' })
  async updateRefundStatus(
    @Param('refundId') refundId: string,
    @Body() updateDto: UpdateRefundStatusDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Updating refund status: ${refundId} to ${updateDto.status}`);
      
      // 처리자 정보 추가
      if (req?.user?.id) {
        updateDto.processedBy = req.user.id;
      }

      return await this.refundService.updateRefundStatus(refundId, updateDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update refund status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 가능 여부 확인
   */
  @Post('check-eligibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 가능 여부 확인' })
  @ApiResponse({
    status: 200,
    description: '환불 가능 여부 확인이 완료되었습니다.',
    type: RefundEligibilityResponseDto,
  })
  async checkRefundEligibility(
    @Body() checkDto: CheckRefundEligibilityDto
  ): Promise<RefundEligibilityResponseDto> {
    return await this.refundService.checkRefundEligibility(checkDto);
  }

  /**
   * 환불 처리 (PG사 연동)
   */
  @Post(':refundId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 처리 (PG사 연동)' })
  @ApiParam({ name: 'refundId', description: '환불 ID' })
  @ApiResponse({
    status: 200,
    description: '환불 처리가 완료되었습니다.',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: '처리 가능한 환불 요청이 아닙니다.' })
  @ApiResponse({ status: 404, description: '환불 내역을 찾을 수 없습니다.' })
  async processRefund(
    @Param('refundId') refundId: string,
    @Req() req?: AuthenticatedRequest
  ): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Processing refund: ${refundId}`);
      return await this.refundService.processRefund(refundId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 통계 조회
   */
  @Get('stats/overview')
  @ApiOperation({ summary: '환불 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '환불 통계가 성공적으로 조회되었습니다.',
    type: RefundStatsDto,
  })
  async getRefundStats(): Promise<RefundStatsDto> {
    return await this.refundService.getRefundStats();
  }

  /**
   * 자동 환불 설정 업데이트
   */
  @Put('config/auto-refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '자동 환불 설정 업데이트' })
  @ApiResponse({
    status: 200,
    description: '자동 환불 설정이 업데이트되었습니다.',
  })
  async updateAutoRefundConfig(
    @Body() config: AutoRefundConfigDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ message: string }> {
    try {
      this.logger.log('Updating auto refund config');
      return await this.refundService.updateAutoRefundConfig(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update auto refund config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 주문별 환불 내역 조회
   */
  @Get('order/:orderId')
  @ApiOperation({ summary: '주문별 환불 내역 조회' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({
    status: 200,
    description: '주문의 환불 내역이 성공적으로 조회되었습니다.',
  })
  async getRefundsByOrder(
    @Param('orderId') orderId: string
  ): Promise<{ 
    refunds: RefundResponseDto[]; 
    totalRefunded: number; 
    pendingRefund: number 
  }> {
    const result = await this.refundService.getRefunds({ 
      page: 1, 
      limit: 100,
      customerId: orderId 
    });

    const totalRefunded = result.refunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + r.actualRefundAmount, 0);

    const pendingRefund = result.refunds
      .filter(r => r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING)
      .reduce((sum, r) => sum + r.refundAmount, 0);

    return {
      refunds: result.refunds,
      totalRefunded,
      pendingRefund
    };
  }

  /**
   * 환불 가능한 주문 목록 조회 (고객용)
   */
  @Get('eligible-orders/:customerId')
  @ApiOperation({ summary: '환불 가능한 주문 목록 조회' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiQuery({ name: 'days', description: '최근 N일 내 주문 (기본: 30일)', required: false })
  @ApiResponse({
    status: 200,
    description: '환불 가능한 주문 목록이 성공적으로 조회되었습니다.',
  })
  async getEligibleOrdersForRefund(
    @Param('customerId') customerId: string,
    @Query('days') days?: number
  ): Promise<{
    eligibleOrders: Array<{
      orderId: string;
      orderDate: Date;
      totalAmount: number;
      maxRefundableAmount: number;
      timeRemaining?: string;
      restrictions?: string[];
    }>;
  }> {
    // 실제로는 주문 서비스와 연동하여 구현해야 함
    // 여기서는 예시 응답만 반환
    const mockOrders = [
      {
        orderId: 'order_123',
        orderDate: new Date(),
        totalAmount: 25000,
        maxRefundableAmount: 25000,
        timeRemaining: '23시간 후 수수료 발생',
        restrictions: []
      }
    ];

    return { eligibleOrders: mockOrders };
  }

  /**
   * 환불 사유별 통계 조회
   */
  @Get('stats/by-reason')
  @ApiOperation({ summary: '환불 사유별 통계 조회' })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiResponse({
    status: 200,
    description: '환불 사유별 통계가 성공적으로 조회되었습니다.',
  })
  async getRefundStatsByReason(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    reasonStats: Record<string, { count: number; amount: number; percentage: number }>;
    totalRefunds: number;
    totalAmount: number;
    period: { start: string; end: string };
  }> {
    // 실제로는 더 복잡한 쿼리가 필요
    const stats = await this.refundService.getRefundStats();
    
    const totalRefunds = stats.totalRefunds;
    const totalAmount = stats.totalRefundAmount;

    const reasonStats: Record<string, { count: number; amount: number; percentage: number }> = {};

    Object.entries(stats.refundsByReason).forEach(([reason, count]) => {
      reasonStats[reason] = {
        count,
        amount: 0, // 실제로는 각 사유별 금액을 계산해야 함
        percentage: totalRefunds > 0 ? (count / totalRefunds) * 100 : 0
      };
    });

    return {
      reasonStats,
      totalRefunds,
      totalAmount,
      period: {
        start: startDate || '전체 기간',
        end: endDate || '현재'
      }
    };
  }

  /**
   * 환불 처리 시간 분석
   */
  @Get('stats/processing-time')
  @ApiOperation({ summary: '환불 처리 시간 분석' })
  @ApiResponse({
    status: 200,
    description: '환불 처리 시간 분석 결과가 성공적으로 조회되었습니다.',
  })
  async getProcessingTimeAnalysis(): Promise<{
    averageProcessingTime: number;
    processingTimeByType: Record<RefundType, number>;
    processingTimeByAmount: {
      under10k: number;
      between10k50k: number;
      over50k: number;
    };
    slaCompliance: {
      target: number; // 목표 시간 (분)
      actual: number; // 실제 평균 시간
      complianceRate: number; // 준수율 (%)
    };
  }> {
    const stats = await this.refundService.getRefundStats();
    
    // 실제로는 더 세부적인 분석이 필요
    return {
      averageProcessingTime: stats.averageProcessingTime,
      processingTimeByType: {
        [RefundType.FULL]: stats.averageProcessingTime * 1.2,
        [RefundType.PARTIAL]: stats.averageProcessingTime * 0.8,
        [RefundType.ITEM_CANCEL]: stats.averageProcessingTime * 0.6,
        [RefundType.DELIVERY_CANCEL]: stats.averageProcessingTime * 0.4
      },
      processingTimeByAmount: {
        under10k: stats.averageProcessingTime * 0.5,
        between10k50k: stats.averageProcessingTime * 1.0,
        over50k: stats.averageProcessingTime * 1.5
      },
      slaCompliance: {
        target: 60, // 1시간 목표
        actual: stats.averageProcessingTime,
        complianceRate: stats.averageProcessingTime <= 60 ? 100 : (60 / stats.averageProcessingTime) * 100
      }
    };
  }

  /**
   * 환불 예상 계산
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 예상 계산' })
  @ApiResponse({
    status: 200,
    description: '환불 예상 금액이 성공적으로 계산되었습니다.',
  })
  async calculateRefund(
    @Body() body: {
      orderId: string;
      refundType: RefundType;
      refundAmount?: number;
      refundItems?: Array<{ menuId: string; quantity: number }>;
      refundDeliveryFee?: boolean;
    }
  ): Promise<{
    originalAmount: number;
    refundAmount: number;
    refundFee: number;
    actualRefundAmount: number;
    breakdown: {
      itemsRefund: number;
      deliveryFeeRefund: number;
      discountAdjustment: number;
    };
    timeBasedFee: {
      hoursAfterPayment: number;
      feeApplies: boolean;
      feePercentage: number;
    };
  }> {
    // 환불 가능 여부 확인을 통해 계산 정보 얻기
    const eligibility = await this.refundService.checkRefundEligibility({
      orderId: body.orderId,
      type: body.refundType,
      refundAmount: body.refundAmount
    });

    // 실제로는 더 정확한 계산 로직이 필요
    return {
      originalAmount: eligibility.maxRefundableAmount + eligibility.refundFee, // 대략적 계산
      refundAmount: eligibility.maxRefundableAmount,
      refundFee: eligibility.refundFee,
      actualRefundAmount: eligibility.expectedRefundAmount,
      breakdown: {
        itemsRefund: body.refundAmount || eligibility.maxRefundableAmount,
        deliveryFeeRefund: body.refundDeliveryFee ? 3000 : 0, // 예시 배달비
        discountAdjustment: 0
      },
      timeBasedFee: {
        hoursAfterPayment: 12, // 예시값
        feeApplies: eligibility.refundFee > 0,
        feePercentage: eligibility.refundFee > 0 ? 3 : 0
      }
    };
  }

  /**
   * 환불 요청 취소
   */
  @Put(':refundId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 요청 취소' })
  @ApiParam({ name: 'refundId', description: '환불 ID' })
  @ApiResponse({
    status: 200,
    description: '환불 요청이 성공적으로 취소되었습니다.',
    type: RefundResponseDto,
  })
  async cancelRefund(
    @Param('refundId') refundId: string,
    @Body() body: { reason?: string },
    @Req() req?: AuthenticatedRequest
  ): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Cancelling refund: ${refundId}`);
      
      return await this.refundService.updateRefundStatus(refundId, {
        status: RefundStatus.CANCELLED,
        processedBy: req?.user?.id,
        adminNote: body.reason || '환불 요청 취소'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to cancel refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 승인 (관리자용)
   */
  @Put(':refundId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '환불 승인 (관리자용)' })
  @ApiParam({ name: 'refundId', description: '환불 ID' })
  @ApiResponse({
    status: 200,
    description: '환불이 승인되어 처리되었습니다.',
    type: RefundResponseDto,
  })
  async approveRefund(
    @Param('refundId') refundId: string,
    @Body() body: { adminNote?: string },
    @Req() req?: AuthenticatedRequest
  ): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Approving refund: ${refundId}`);
      
      // 먼저 승인으로 상태 변경
      await this.refundService.updateRefundStatus(refundId, {
        status: RefundStatus.PROCESSING,
        processedBy: req?.user?.id,
        adminNote: body.adminNote || '관리자 승인'
      });

      // 그 다음 실제 환불 처리
      return await this.refundService.processRefund(refundId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to approve refund: ${errorMessage}`);
      throw error;
    }
  }
} 