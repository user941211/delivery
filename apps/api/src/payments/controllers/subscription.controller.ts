/**
 * 정기 결제 및 구독 시스템 컨트롤러
 * 
 * 구독 생성, 관리, 결제 처리, 통계 조회 API를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  ValidationPipe,
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

import { SubscriptionService } from '../services/subscription.service';

import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  GetSubscriptionsQueryDto,
  UpdateSubscriptionStatusDto,
  UpdateSubscriptionDto,
  SubscriptionPaymentDto,
  SubscriptionStatsDto,
  BulkSubscriptionActionDto,
  SubscriptionRenewalPreviewDto,
  SubscriptionStatus,
  SubscriptionType,
  SubscriptionInterval
} from '../dto/subscription.dto';

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
 * 구독 시스템 컨트롤러 클래스
 */
@ApiTags('Subscriptions')
@Controller('subscriptions')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService
  ) {}

  /**
   * 구독 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '새 구독 생성' })
  @ApiResponse({
    status: 201,
    description: '구독이 성공적으로 생성되었습니다.',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 404, description: '구독 계획을 찾을 수 없습니다.' })
  async createSubscription(
    @Body() createDto: CreateSubscriptionDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Creating subscription for customer: ${createDto.customerId}`);
      return await this.subscriptionService.createSubscription(createDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '구독 목록 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'status', description: '구독 상태', enum: SubscriptionStatus, required: false })
  @ApiQuery({ name: 'type', description: '구독 타입', enum: SubscriptionType, required: false })
  @ApiQuery({ name: 'customerId', description: '고객 ID', required: false })
  @ApiQuery({ name: 'restaurantId', description: '가게 ID', required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiResponse({
    status: 200,
    description: '구독 목록이 성공적으로 조회되었습니다.',
  })
  async getSubscriptions(
    @Query() query: GetSubscriptionsQueryDto
  ): Promise<{ 
    subscriptions: SubscriptionResponseDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    const result = await this.subscriptionService.getSubscriptions(query);
    const totalPages = Math.ceil(result.total / (query.limit || 20));
    
    return {
      ...result,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages
    };
  }

  /**
   * 구독 상세 조회
   */
  @Get(':subscriptionId')
  @ApiOperation({ summary: '구독 상세 조회' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독 정보가 성공적으로 조회되었습니다.',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: '구독을 찾을 수 없습니다.' })
  async getSubscription(
    @Param('subscriptionId') subscriptionId: string
  ): Promise<SubscriptionResponseDto> {
    return await this.subscriptionService.getSubscriptionById(subscriptionId);
  }

  /**
   * 구독 상태 업데이트
   */
  @Put(':subscriptionId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 상태 업데이트' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독 상태가 성공적으로 업데이트되었습니다.',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: '구독을 찾을 수 없습니다.' })
  async updateSubscriptionStatus(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateDto: UpdateSubscriptionStatusDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Updating subscription status: ${subscriptionId} to ${updateDto.status}`);
      
      // 처리자 정보 추가
      if (req?.user?.id) {
        updateDto.processedBy = req.user.id;
      }

      return await this.subscriptionService.updateSubscriptionStatus(subscriptionId, updateDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update subscription status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 정보 수정
   */
  @Put(':subscriptionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 정보 수정' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독 정보가 성공적으로 수정되었습니다.',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: '구독을 찾을 수 없습니다.' })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateDto: UpdateSubscriptionDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Updating subscription: ${subscriptionId}`);
      return await this.subscriptionService.updateSubscription(subscriptionId, updateDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 일시정지
   */
  @Put(':subscriptionId/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 일시정지' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독이 성공적으로 일시정지되었습니다.',
    type: SubscriptionResponseDto,
  })
  async pauseSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { reason?: string; pauseDurationDays?: number },
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Pausing subscription: ${subscriptionId}`);
      
      return await this.subscriptionService.updateSubscriptionStatus(subscriptionId, {
        status: SubscriptionStatus.PAUSED,
        reason: body.reason || '고객 요청',
        pauseDurationDays: body.pauseDurationDays,
        processedBy: req?.user?.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to pause subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 재개
   */
  @Put(':subscriptionId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 재개' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독이 성공적으로 재개되었습니다.',
    type: SubscriptionResponseDto,
  })
  async resumeSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { reason?: string },
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Resuming subscription: ${subscriptionId}`);
      
      return await this.subscriptionService.updateSubscriptionStatus(subscriptionId, {
        status: SubscriptionStatus.ACTIVE,
        reason: body.reason || '구독 재개',
        processedBy: req?.user?.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to resume subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 취소
   */
  @Put(':subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 취소' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독이 성공적으로 취소되었습니다.',
    type: SubscriptionResponseDto,
  })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { reason?: string; immediate?: boolean },
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Cancelling subscription: ${subscriptionId}`);
      
      return await this.subscriptionService.updateSubscriptionStatus(subscriptionId, {
        status: SubscriptionStatus.CANCELLED,
        reason: body.reason || '고객 요청',
        immediate: body.immediate ?? true,
        processedBy: req?.user?.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to cancel subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 정기 결제 처리
   */
  @Post(':subscriptionId/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독 결제 처리' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '결제가 성공적으로 처리되었습니다.',
    type: SubscriptionPaymentDto,
  })
  @ApiResponse({ status: 400, description: '활성 상태의 구독만 결제할 수 있습니다.' })
  async processPayment(
    @Param('subscriptionId') subscriptionId: string,
    @Req() req?: AuthenticatedRequest
  ): Promise<SubscriptionPaymentDto> {
    try {
      this.logger.log(`Processing payment for subscription: ${subscriptionId}`);
      return await this.subscriptionService.processSubscriptionPayment(subscriptionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process payment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 갱신 미리보기
   */
  @Get(':subscriptionId/renewal-preview')
  @ApiOperation({ summary: '구독 갱신 미리보기' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '구독 갱신 미리보기가 성공적으로 조회되었습니다.',
    type: SubscriptionRenewalPreviewDto,
  })
  async getRenewalPreview(
    @Param('subscriptionId') subscriptionId: string
  ): Promise<SubscriptionRenewalPreviewDto> {
    return await this.subscriptionService.getSubscriptionRenewalPreview(subscriptionId);
  }

  /**
   * 구독 통계 조회
   */
  @Get('stats/overview')
  @ApiOperation({ summary: '구독 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '구독 통계가 성공적으로 조회되었습니다.',
    type: SubscriptionStatsDto,
  })
  async getSubscriptionStats(): Promise<SubscriptionStatsDto> {
    return await this.subscriptionService.getSubscriptionStats();
  }

  /**
   * 일괄 구독 작업
   */
  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '일괄 구독 작업' })
  @ApiResponse({
    status: 200,
    description: '일괄 작업이 완료되었습니다.',
  })
  async bulkAction(
    @Body() actionDto: BulkSubscriptionActionDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ processed: number; errors: string[] }> {
    try {
      this.logger.log(`Performing bulk action: ${actionDto.action} on ${actionDto.subscriptionIds.length} subscriptions`);
      return await this.subscriptionService.bulkSubscriptionAction(actionDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to perform bulk action: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 고객별 구독 목록 조회
   */
  @Get('customer/:customerId')
  @ApiOperation({ summary: '고객별 구독 목록 조회' })
  @ApiParam({ name: 'customerId', description: '고객 ID' })
  @ApiQuery({ name: 'status', description: '구독 상태 필터', enum: SubscriptionStatus, required: false })
  @ApiResponse({
    status: 200,
    description: '고객의 구독 목록이 성공적으로 조회되었습니다.',
  })
  async getCustomerSubscriptions(
    @Param('customerId') customerId: string,
    @Query('status') status?: SubscriptionStatus
  ): Promise<{ 
    subscriptions: SubscriptionResponseDto[]; 
    summary: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      totalMonthlySpend: number;
    }
  }> {
    const result = await this.subscriptionService.getSubscriptions({ 
      customerId, 
      status,
      limit: 100 
    });

    const summary = {
      totalSubscriptions: result.total,
      activeSubscriptions: result.subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
      totalMonthlySpend: result.subscriptions
        .filter(s => s.status === SubscriptionStatus.ACTIVE)
        .reduce((sum, s) => {
          // 월간 비용으로 변환
          let monthlyAmount = s.currentPrice;
          switch (s.plan.interval) {
            case SubscriptionInterval.DAILY:
              monthlyAmount *= 30;
              break;
            case SubscriptionInterval.WEEKLY:
              monthlyAmount *= 4.33;
              break;
            case SubscriptionInterval.QUARTERLY:
              monthlyAmount /= 3;
              break;
            case SubscriptionInterval.YEARLY:
              monthlyAmount /= 12;
              break;
          }
          return sum + monthlyAmount;
        }, 0)
    };

    return {
      subscriptions: result.subscriptions,
      summary
    };
  }

  /**
   * 구독 계획별 통계
   */
  @Get('stats/by-plan')
  @ApiOperation({ summary: '구독 계획별 통계' })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiResponse({
    status: 200,
    description: '구독 계획별 통계가 성공적으로 조회되었습니다.',
  })
  async getStatsByPlan(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    planStats: Array<{
      planId: string;
      planName: string;
      totalSubscriptions: number;
      activeSubscriptions: number;
      totalRevenue: number;
      averageLifetime: number;
      churnRate: number;
    }>;
    period: { start: string; end: string };
  }> {
    // 실제로는 더 복잡한 쿼리와 계산이 필요
    const mockStats = [
      {
        planId: 'plan_basic',
        planName: '베이직 플랜',
        totalSubscriptions: 150,
        activeSubscriptions: 120,
        totalRevenue: 1800000,
        averageLifetime: 8.5,
        churnRate: 5.2
      },
      {
        planId: 'plan_premium',
        planName: '프리미엄 플랜',
        totalSubscriptions: 85,
        activeSubscriptions: 75,
        totalRevenue: 2550000,
        averageLifetime: 12.3,
        churnRate: 3.1
      }
    ];

    return {
      planStats: mockStats,
      period: {
        start: startDate || '전체 기간',
        end: endDate || '현재'
      }
    };
  }

  /**
   * 구독 수익 분석
   */
  @Get('stats/revenue')
  @ApiOperation({ summary: '구독 수익 분석' })
  @ApiQuery({ name: 'period', description: '분석 기간', required: false })
  @ApiResponse({
    status: 200,
    description: '구독 수익 분석이 성공적으로 조회되었습니다.',
  })
  async getRevenueAnalysis(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<{
    currentPeriod: {
      revenue: number;
      newSubscriptions: number;
      churnedSubscriptions: number;
      netGrowth: number;
    };
    previousPeriod: {
      revenue: number;
      newSubscriptions: number;
      churnedSubscriptions: number;
      netGrowth: number;
    };
    growth: {
      revenueGrowthRate: number;
      subscriptionGrowthRate: number;
      churnGrowthRate: number;
    };
    forecast: {
      nextPeriodRevenue: number;
      confidenceLevel: number;
    };
  }> {
    // 실제로는 더 복잡한 수익 분석 로직이 필요
    return {
      currentPeriod: {
        revenue: 5200000,
        newSubscriptions: 45,
        churnedSubscriptions: 8,
        netGrowth: 37
      },
      previousPeriod: {
        revenue: 4800000,
        newSubscriptions: 38,
        churnedSubscriptions: 12,
        netGrowth: 26
      },
      growth: {
        revenueGrowthRate: 8.33,
        subscriptionGrowthRate: 18.42,
        churnGrowthRate: -33.33
      },
      forecast: {
        nextPeriodRevenue: 5616000,
        confidenceLevel: 85
      }
    };
  }

  /**
   * 구독 이탈 위험 분석
   */
  @Get('stats/churn-risk')
  @ApiOperation({ summary: '구독 이탈 위험 분석' })
  @ApiResponse({
    status: 200,
    description: '구독 이탈 위험 분석이 성공적으로 조회되었습니다.',
  })
  async getChurnRiskAnalysis(): Promise<{
    highRisk: Array<{
      subscriptionId: string;
      customerId: string;
      riskScore: number;
      riskFactors: string[];
      recommendedActions: string[];
    }>;
    mediumRisk: Array<{
      subscriptionId: string;
      customerId: string;
      riskScore: number;
      riskFactors: string[];
    }>;
    totalAtRisk: number;
    riskDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  }> {
    // 실제로는 머신러닝 모델을 사용한 이탈 위험 예측이 필요
    return {
      highRisk: [
        {
          subscriptionId: 'sub_123',
          customerId: 'cust_456',
          riskScore: 0.85,
          riskFactors: ['3회 연속 결제 실패', '6개월간 주문 없음', '고객 지원 불만 접수'],
          recommendedActions: ['개인화된 할인 제공', '고객 지원팀 연락', '서비스 개선 안내']
        }
      ],
      mediumRisk: [
        {
          subscriptionId: 'sub_789',
          customerId: 'cust_012',
          riskScore: 0.62,
          riskFactors: ['주문 빈도 감소', '경쟁사 프로모션 참여'],
        }
      ],
      totalAtRisk: 23,
      riskDistribution: {
        high: 5,
        medium: 18,
        low: 177
      }
    };
  }

  /**
   * 구독 갱신 일정 조회
   */
  @Get('renewal-schedule')
  @ApiOperation({ summary: '구독 갱신 일정 조회' })
  @ApiQuery({ name: 'days', description: '조회할 일수 (기본: 30일)', required: false })
  @ApiQuery({ name: 'status', description: '구독 상태', enum: SubscriptionStatus, required: false })
  @ApiResponse({
    status: 200,
    description: '구독 갱신 일정이 성공적으로 조회되었습니다.',
  })
  async getRenewalSchedule(
    @Query('days') days: number = 30,
    @Query('status') status?: SubscriptionStatus
  ): Promise<{
    upcomingRenewals: Array<{
      subscriptionId: string;
      customerId: string;
      planName: string;
      renewalDate: Date;
      amount: number;
      riskLevel: 'high' | 'medium' | 'low';
    }>;
    dailySchedule: Array<{
      date: string;
      renewalCount: number;
      totalAmount: number;
    }>;
    summary: {
      totalRenewals: number;
      totalRevenue: number;
      averageValue: number;
    };
  }> {
    // 실제로는 데이터베이스에서 갱신 일정을 조회해야 함
    const mockRenewals = [
      {
        subscriptionId: 'sub_123',
        customerId: 'cust_456',
        planName: '프리미엄 플랜',
        renewalDate: new Date('2024-01-15'),
        amount: 29900,
        riskLevel: 'low' as const
      }
    ];

    const mockDailySchedule = [
      {
        date: '2024-01-15',
        renewalCount: 15,
        totalAmount: 448500
      }
    ];

    return {
      upcomingRenewals: mockRenewals,
      dailySchedule: mockDailySchedule,
      summary: {
        totalRenewals: 45,
        totalRevenue: 1347000,
        averageValue: 29933
      }
    };
  }

  /**
   * 구독 프로모션 적용
   */
  @Post(':subscriptionId/apply-promotion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '구독에 프로모션 적용' })
  @ApiParam({ name: 'subscriptionId', description: '구독 ID' })
  @ApiResponse({
    status: 200,
    description: '프로모션이 성공적으로 적용되었습니다.',
  })
  async applyPromotion(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: {
      promotionCode: string;
      applyFrom?: 'next_billing' | 'immediately';
    },
    @Req() req?: AuthenticatedRequest
  ): Promise<{
    subscription: SubscriptionResponseDto;
    promotion: {
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      validUntil?: Date;
    };
    newAmount: number;
    savings: number;
  }> {
    // 실제로는 프로모션 서비스와 연동하여 처리해야 함
    const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
    
    // Mock 프로모션 적용
    const mockPromotion = {
      code: body.promotionCode,
      discountType: 'percentage' as const,
      discountValue: 20,
      validUntil: new Date('2024-12-31')
    };

    const discountAmount = subscription.currentPrice * (mockPromotion.discountValue / 100);
    const newAmount = subscription.currentPrice - discountAmount;

    return {
      subscription,
      promotion: mockPromotion,
      newAmount,
      savings: discountAmount
    };
  }
} 