/**
 * 포인트 적립 및 사용 시스템 컨트롤러
 * 
 * 포인트 적립, 사용, 관리 및 통계 API를 제공합니다.
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
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PointsService } from '../services/points.service';

import {
  EarnPointsDto,
  UsePointsDto,
  PointBalanceResponseDto,
  PointTransactionDto,
  GetPointTransactionsQueryDto,
  RefundPointsDto,
  ExpirePointsDto,
  PointExpiryResultDto,
  PointStatsDto,
  ReservePointsDto,
  ConfirmReservedPointsDto,
  PointTransactionType,
  PointTransactionStatus
} from '../dto/points.dto';

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
 * 포인트 시스템 컨트롤러 클래스
 */
@ApiTags('Points')
@Controller('points')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class PointsController {
  private readonly logger = new Logger(PointsController.name);

  constructor(
    private readonly pointsService: PointsService
  ) {}

  /**
   * 포인트 적립
   */
  @Post('earn')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '포인트 적립' })
  @ApiResponse({
    status: 201,
    description: '포인트가 성공적으로 적립되었습니다.',
    type: PointTransactionDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  async earnPoints(
    @Body() earnPointsDto: EarnPointsDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Earning points for customer: ${earnPointsDto.customerId}`);
      return await this.pointsService.earnPoints(earnPointsDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to earn points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 사용
   */
  @Post('use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '포인트 사용' })
  @ApiResponse({
    status: 200,
    description: '포인트가 성공적으로 사용되었습니다.',
    type: PointTransactionDto,
  })
  @ApiResponse({ status: 400, description: '사용 가능한 포인트가 부족합니다.' })
  async usePoints(
    @Body() usePointsDto: UsePointsDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Using points for customer: ${usePointsDto.customerId}`);
      return await this.pointsService.usePoints(usePointsDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to use points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 잔액 조회
   */
  @Get('balance/:customerId')
  @ApiOperation({ summary: '포인트 잔액 조회' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiResponse({
    status: 200,
    description: '포인트 잔액이 성공적으로 조회되었습니다.',
    type: PointBalanceResponseDto,
  })
  async getPointBalance(
    @Param('customerId') customerId: string
  ): Promise<PointBalanceResponseDto> {
    return await this.pointsService.getPointBalance(customerId);
  }

  /**
   * 포인트 거래 내역 조회
   */
  @Get('transactions/:customerId')
  @ApiOperation({ summary: '포인트 거래 내역 조회' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'type', description: '거래 타입', enum: PointTransactionType, required: false })
  @ApiQuery({ name: 'status', description: '거래 상태', enum: PointTransactionStatus, required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiQuery({ name: 'orderId', description: '주문 ID', required: false })
  @ApiResponse({
    status: 200,
    description: '포인트 거래 내역이 성공적으로 조회되었습니다.',
  })
  async getPointTransactions(
    @Param('customerId') customerId: string,
    @Query() query: GetPointTransactionsQueryDto
  ): Promise<{ transactions: PointTransactionDto[]; total: number; page: number; limit: number }> {
    const result = await this.pointsService.getPointTransactions(customerId, query);
    
    return {
      ...result,
      page: query.page || 1,
      limit: query.limit || 20
    };
  }

  /**
   * 포인트 환불
   */
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '포인트 환불' })
  @ApiResponse({
    status: 200,
    description: '포인트가 성공적으로 환불되었습니다.',
    type: PointTransactionDto,
  })
  @ApiResponse({ status: 404, description: '환불할 포인트 사용 내역을 찾을 수 없습니다.' })
  async refundPoints(
    @Body() refundPointsDto: RefundPointsDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Refunding points for customer: ${refundPointsDto.customerId}`);
      return await this.pointsService.refundPoints(refundPointsDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to refund points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 만료 처리
   */
  @Post('expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '포인트 만료 처리' })
  @ApiResponse({
    status: 200,
    description: '포인트 만료 처리가 완료되었습니다.',
    type: PointExpiryResultDto,
  })
  async expirePoints(
    @Body() expirePointsDto: ExpirePointsDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<PointExpiryResultDto> {
    try {
      this.logger.log(`Processing point expiry, dryRun: ${expirePointsDto.dryRun}`);
      return await this.pointsService.expirePoints(expirePointsDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to expire points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 통계 조회
   */
  @Get('stats')
  @ApiOperation({ summary: '포인트 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '포인트 통계가 성공적으로 조회되었습니다.',
    type: PointStatsDto,
  })
  async getPointStats(): Promise<PointStatsDto> {
    return await this.pointsService.getPointStats();
  }

  /**
   * 고객의 사용 가능 포인트 확인
   */
  @Get('available/:customerId')
  @ApiOperation({ summary: '사용 가능한 포인트 확인' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiQuery({ name: 'amount', description: '사용하려는 포인트', required: false })
  @ApiResponse({
    status: 200,
    description: '사용 가능한 포인트 정보가 성공적으로 조회되었습니다.',
  })
  async getAvailablePoints(
    @Param('customerId') customerId: string,
    @Query('amount') amount?: number
  ): Promise<{
    availablePoints: number;
    canUse: boolean;
    expiringPoints: number;
    nextExpiryDate?: Date;
    message?: string;
  }> {
    const balance = await this.pointsService.getPointBalance(customerId);
    
    const canUse = amount ? balance.availablePoints >= amount : true;
    let message: string | undefined;

    if (amount && !canUse) {
      message = `사용 가능한 포인트(${balance.availablePoints})가 요청 포인트(${amount})보다 부족합니다.`;
    }

    if (balance.expiringPoints > 0 && balance.nextExpiryDate) {
      message = message ? 
        `${message} 또한 ${balance.expiringPoints} 포인트가 ${balance.nextExpiryDate.toLocaleDateString()}에 만료됩니다.` :
        `${balance.expiringPoints} 포인트가 ${balance.nextExpiryDate.toLocaleDateString()}에 만료됩니다.`;
    }

    return {
      availablePoints: balance.availablePoints,
      canUse,
      expiringPoints: balance.expiringPoints,
      nextExpiryDate: balance.nextExpiryDate,
      message
    };
  }

  /**
   * 포인트 적립 규칙 조회 (고객용)
   */
  @Get('earn-rules')
  @ApiOperation({ summary: '포인트 적립 규칙 조회' })
  @ApiQuery({ name: 'restaurantId', description: '가게 ID (선택)', required: false })
  @ApiResponse({
    status: 200,
    description: '포인트 적립 규칙이 성공적으로 조회되었습니다.',
  })
  async getEarnRules(
    @Query('restaurantId') restaurantId?: string
  ): Promise<{
    rules: Array<{
      name: string;
      source: string;
      earnRate: number;
      fixedPoints: number;
      minOrderAmount: number;
      maxEarnPoints: number;
      expiryDays?: number;
      description: string;
    }>;
  }> {
    // 실제로는 점포별 적립 규칙을 데이터베이스에서 조회해야 함
    // 여기서는 예시 데이터 반환
    const defaultRules = [
      {
        name: '주문 완료 적립',
        source: 'order_completion',
        earnRate: 1, // 1%
        fixedPoints: 0,
        minOrderAmount: 10000,
        maxEarnPoints: 1000,
        expiryDays: 365,
        description: '주문 완료 시 주문 금액의 1% 적립 (최대 1,000포인트)'
      },
      {
        name: '첫 주문 보너스',
        source: 'first_order',
        earnRate: 0,
        fixedPoints: 1000,
        minOrderAmount: 5000,
        maxEarnPoints: 1000,
        expiryDays: 30,
        description: '첫 주문 시 1,000 포인트 보너스 적립'
      },
      {
        name: '리뷰 작성 적립',
        source: 'review_write',
        earnRate: 0,
        fixedPoints: 500,
        minOrderAmount: 0,
        maxEarnPoints: 500,
        expiryDays: 90,
        description: '리뷰 작성 시 500 포인트 적립'
      }
    ];

    return { rules: defaultRules };
  }

  /**
   * 포인트 적립 예상 계산
   */
  @Post('calculate-earn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '포인트 적립 예상 계산' })
  @ApiResponse({
    status: 200,
    description: '포인트 적립 예상값이 성공적으로 계산되었습니다.',
  })
  async calculateEarnPoints(
    @Body() body: {
      customerId: string;
      orderAmount: number;
      restaurantId?: string;
      isFirstOrder?: boolean;
    }
  ): Promise<{
    estimatedPoints: number;
    breakdown: Array<{
      source: string;
      name: string;
      points: number;
      description: string;
    }>;
    expiryDate?: Date;
  }> {
    const { orderAmount, isFirstOrder = false } = body;
    
    const breakdown: Array<{
      source: string;
      name: string;
      points: number;
      description: string;
    }> = [];

    let totalPoints = 0;

    // 주문 완료 적립 (1%)
    if (orderAmount >= 10000) {
      const orderPoints = Math.min(Math.floor(orderAmount * 0.01), 1000);
      totalPoints += orderPoints;
      breakdown.push({
        source: 'order_completion',
        name: '주문 완료 적립',
        points: orderPoints,
        description: `주문 금액의 1% (최대 1,000포인트)`
      });
    }

    // 첫 주문 보너스
    if (isFirstOrder && orderAmount >= 5000) {
      totalPoints += 1000;
      breakdown.push({
        source: 'first_order',
        name: '첫 주문 보너스',
        points: 1000,
        description: '첫 주문 1,000포인트 보너스'
      });
    }

    // 만료일 계산 (1년 후)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      estimatedPoints: totalPoints,
      breakdown,
      expiryDate
    };
  }

  /**
   * 포인트 사용 내역 취소 (관리자용)
   */
  @Put('transactions/:transactionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '포인트 거래 취소 (관리자용)' })
  @ApiParam({ name: 'transactionId', description: '거래 ID' })
  @ApiResponse({
    status: 200,
    description: '포인트 거래가 성공적으로 취소되었습니다.',
  })
  async cancelPointTransaction(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() body: { reason?: string },
    @Req() req?: AuthenticatedRequest
  ): Promise<{ message: string; cancelledTransaction: PointTransactionDto }> {
    // 실제로는 거래 취소 로직을 구현해야 함
    // 여기서는 예시 응답만 반환
    throw new BadRequestException('포인트 거래 취소 기능은 아직 구현되지 않았습니다.');
  }

  /**
   * 고객별 포인트 요약 정보
   */
  @Get('summary/:customerId')
  @ApiOperation({ summary: '고객 포인트 요약 정보' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiResponse({
    status: 200,
    description: '고객 포인트 요약 정보가 성공적으로 조회되었습니다.',
  })
  async getCustomerPointSummary(
    @Param('customerId') customerId: string
  ): Promise<{
    balance: PointBalanceResponseDto;
    recentTransactions: PointTransactionDto[];
    monthlyEarned: number;
    monthlyUsed: number;
    totalEarned: number;
    totalUsed: number;
    rankInfo?: {
      currentRank: string;
      nextRank: string;
      pointsToNext: number;
    };
  }> {
    // 잔액 조회
    const balance = await this.pointsService.getPointBalance(customerId);

    // 최근 거래 내역 (최대 10개)
    const { transactions: recentTransactions } = await this.pointsService.getPointTransactions(
      customerId, 
      { page: 1, limit: 10 }
    );

    // 이번 달 통계
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    
    const { transactions: monthlyTransactions } = await this.pointsService.getPointTransactions(
      customerId,
      { 
        startDate: monthStart.toISOString(),
        limit: 1000
      }
    );

    const monthlyEarned = monthlyTransactions
      .filter(tx => tx.type === PointTransactionType.EARN)
      .reduce((sum, tx) => sum + tx.points, 0);

    const monthlyUsed = Math.abs(monthlyTransactions
      .filter(tx => tx.type === PointTransactionType.USE)
      .reduce((sum, tx) => sum + tx.points, 0));

    // 전체 통계
    const { transactions: allTransactions } = await this.pointsService.getPointTransactions(
      customerId,
      { limit: 10000 }
    );

    const totalEarned = allTransactions
      .filter(tx => tx.type === PointTransactionType.EARN)
      .reduce((sum, tx) => sum + tx.points, 0);

    const totalUsed = Math.abs(allTransactions
      .filter(tx => tx.type === PointTransactionType.USE)
      .reduce((sum, tx) => sum + tx.points, 0));

    // 등급 정보 (예시)
    const rankInfo = this.calculateCustomerRank(totalEarned);

    return {
      balance,
      recentTransactions,
      monthlyEarned,
      monthlyUsed,
      totalEarned,
      totalUsed,
      rankInfo
    };
  }

  /**
   * 고객 등급 계산 (내부 메서드)
   */
  private calculateCustomerRank(totalEarned: number): {
    currentRank: string;
    nextRank: string;
    pointsToNext: number;
  } {
    const ranks = [
      { name: 'Bronze', minPoints: 0 },
      { name: 'Silver', minPoints: 10000 },
      { name: 'Gold', minPoints: 50000 },
      { name: 'Platinum', minPoints: 100000 },
      { name: 'Diamond', minPoints: 200000 }
    ];

    let currentRank = ranks[0];
    let nextRank = ranks[1];

    for (let i = 0; i < ranks.length; i++) {
      if (totalEarned >= ranks[i].minPoints) {
        currentRank = ranks[i];
        nextRank = ranks[i + 1] || ranks[i]; // 최고 등급이면 현재 등급 유지
      }
    }

    const pointsToNext = nextRank ? nextRank.minPoints - totalEarned : 0;

    return {
      currentRank: currentRank.name,
      nextRank: nextRank.name,
      pointsToNext: Math.max(0, pointsToNext)
    };
  }
} 