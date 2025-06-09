/**
 * 정기 결제 및 구독 시스템 서비스
 * 
 * 구독 생성, 관리, 정기 결제 처리, 스케줄링을 담당합니다.
 */

import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  SubscriptionStatus,
  SubscriptionInterval,
  SubscriptionType,
  FailureHandlingType,
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  GetSubscriptionsQueryDto,
  UpdateSubscriptionStatusDto,
  UpdateSubscriptionDto,
  SubscriptionPaymentDto,
  SubscriptionStatsDto,
  RetryConfigDto,
  BulkSubscriptionActionDto,
  SubscriptionRenewalPreviewDto,
  SubscriptionPlanDto
} from '../dto/subscription.dto';

/**
 * 구독 엔티티 인터페이스
 */
interface SubscriptionEntity {
  id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_price: number;
  next_billing_date?: string;
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  created_at: string;
  cancelled_at?: string;
  paused_at?: string;
  total_billing_cycles: number;
  successful_payments: number;
  failed_payments: number;
  total_paid_amount: number;
  payment_method_id?: string;
  delivery_address_id?: string;
  delivery_time_preference?: any;
  auto_renew: boolean;
  notes?: string;
  discount_info?: any;
  metadata?: any;
}

/**
 * 구독 계획 엔티티 인터페이스
 */
interface SubscriptionPlanEntity {
  id: string;
  name: string;
  description: string;
  type: SubscriptionType;
  price: number;
  interval: SubscriptionInterval;
  interval_count: number;
  trial_period_days?: number;
  setup_fee?: number;
  is_active: boolean;
  max_duration_months?: number;
  benefits?: string[];
  restaurant_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 구독 결제 엔티티 인터페이스
 */
interface SubscriptionPaymentEntity {
  id: string;
  subscription_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  attempt_date: string;
  paid_date?: string;
  billing_cycle: number;
  pg_transaction_id?: string;
  failure_reason?: string;
  retry_count: number;
  next_retry_date?: string;
  created_at: string;
}

/**
 * 정기 결제 및 구독 시스템 서비스 클래스
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 구독 생성
   */
  async createSubscription(createDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Creating subscription for customer: ${createDto.customerId}`);

      // 구독 계획 조회
      const plan = await this.getSubscriptionPlanById(createDto.planId);
      if (!plan) {
        throw new NotFoundException('구독 계획을 찾을 수 없습니다.');
      }

      // 무료 체험 종료일 계산
      const trialEndDate = plan.trial_period_days 
        ? new Date(Date.now() + plan.trial_period_days * 24 * 60 * 60 * 1000)
        : null;

      // 첫 번째 결제일 계산
      const startDate = createDto.startDate ? new Date(createDto.startDate) : new Date();
      const firstBillingDate = trialEndDate || this.calculateNextBillingDate(startDate, plan.interval, plan.interval_count);

      // 구독 데이터 생성
      const subscriptionData: Partial<SubscriptionEntity> = {
        customer_id: createDto.customerId,
        plan_id: createDto.planId,
        status: SubscriptionStatus.ACTIVE,
        current_price: plan.price,
        next_billing_date: firstBillingDate.toISOString(),
        start_date: startDate.toISOString(),
        end_date: createDto.endDate ? new Date(createDto.endDate).toISOString() : undefined,
        trial_end_date: trialEndDate?.toISOString(),
        created_at: new Date().toISOString(),
        total_billing_cycles: 0,
        successful_payments: 0,
        failed_payments: 0,
        total_paid_amount: 0,
        payment_method_id: createDto.paymentMethodId,
        delivery_address_id: createDto.deliveryAddressId,
        delivery_time_preference: createDto.deliveryTimePreference,
        auto_renew: createDto.autoRenew ?? true,
        notes: createDto.notes,
        metadata: {
          couponId: createDto.couponId,
          initialSetupFee: plan.setup_fee || 0,
          createdBy: 'system'
        }
      };

      // 할인 정보 처리
      if (createDto.couponId) {
        const discountInfo = await this.calculateCouponDiscount(createDto.couponId, plan.price);
        subscriptionData.discount_info = discountInfo;
        subscriptionData.current_price = Math.max(0, plan.price - discountInfo.discountAmount);
      }

      // 데이터베이스에 구독 저장
      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create subscription:', error);
        throw new InternalServerErrorException('구독 생성에 실패했습니다.');
      }

      // 설정 요금 처리 (있는 경우)
      if (plan.setup_fee && plan.setup_fee > 0) {
        await this.processSetupFee(subscription.id, plan.setup_fee);
      }

      // 첫 번째 결제 스케줄링 (무료 체험이 없는 경우)
      if (!trialEndDate) {
        await this.scheduleNextPayment(subscription.id);
      }

      this.logger.log(`Subscription created successfully: ${subscription.id}`);
      return await this.mapSubscriptionEntityToDto(subscription);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 목록 조회
   */
  async getSubscriptions(query: GetSubscriptionsQueryDto): Promise<{ subscriptions: SubscriptionResponseDto[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, type, customerId, restaurantId, startDate, endDate } = query;

      let dbQuery = this.supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans!inner (
            name,
            description,
            type,
            price,
            interval,
            interval_count,
            trial_period_days,
            setup_fee,
            is_active,
            max_duration_months,
            benefits,
            restaurant_id
          )
        `, { count: 'exact' });

      // 필터 적용
      if (status) {
        dbQuery = dbQuery.eq('status', status);
      }
      if (type) {
        dbQuery = dbQuery.eq('subscription_plans.type', type);
      }
      if (customerId) {
        dbQuery = dbQuery.eq('customer_id', customerId);
      }
      if (restaurantId) {
        dbQuery = dbQuery.eq('subscription_plans.restaurant_id', restaurantId);
      }
      if (startDate) {
        dbQuery = dbQuery.gte('created_at', startDate);
      }
      if (endDate) {
        dbQuery = dbQuery.lte('created_at', endDate);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      dbQuery = dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: subscriptions, error, count } = await dbQuery;

      if (error) {
        this.logger.error('Failed to get subscriptions:', error);
        throw new InternalServerErrorException('구독 목록 조회에 실패했습니다.');
      }

      const mappedSubscriptions = await Promise.all(
        (subscriptions || []).map(sub => this.mapSubscriptionEntityToDto(sub))
      );

      return {
        subscriptions: mappedSubscriptions,
        total: count || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get subscriptions: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 상세 조회
   */
  async getSubscriptionById(subscriptionId: string): Promise<SubscriptionResponseDto> {
    try {
      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            description,
            type,
            price,
            interval,
            interval_count,
            trial_period_days,
            setup_fee,
            is_active,
            max_duration_months,
            benefits,
            restaurant_id
          )
        `)
        .eq('id', subscriptionId)
        .single();

      if (error || !subscription) {
        throw new NotFoundException('구독을 찾을 수 없습니다.');
      }

      return await this.mapSubscriptionEntityToDto(subscription);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 상태 업데이트
   */
  async updateSubscriptionStatus(subscriptionId: string, updateDto: UpdateSubscriptionStatusDto): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Updating subscription status: ${subscriptionId} to ${updateDto.status}`);

      const updateData: Partial<SubscriptionEntity> = {
        status: updateDto.status
      };

      // 상태별 특별 처리
      switch (updateDto.status) {
        case SubscriptionStatus.CANCELLED:
          updateData.cancelled_at = new Date().toISOString();
          updateData.auto_renew = false;
          break;
        case SubscriptionStatus.PAUSED:
          updateData.paused_at = new Date().toISOString();
          if (updateDto.pauseDurationDays) {
            const resumeDate = new Date();
            resumeDate.setDate(resumeDate.getDate() + updateDto.pauseDurationDays);
            updateData.metadata = { resumeDate: resumeDate.toISOString() };
          }
          break;
        case SubscriptionStatus.ACTIVE:
          updateData.paused_at = null;
          updateData.cancelled_at = null;
          break;
      }

      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error || !subscription) {
        throw new NotFoundException('구독을 찾을 수 없습니다.');
      }

      // 상태 변경 이력 기록
      await this.recordStatusChange(subscriptionId, updateDto);

      this.logger.log(`Subscription status updated successfully: ${subscriptionId}`);
      return await this.mapSubscriptionEntityToDto(subscription);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update subscription status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 정보 수정
   */
  async updateSubscription(subscriptionId: string, updateDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Updating subscription: ${subscriptionId}`);

      const updateData: Partial<SubscriptionEntity> = {};

      if (updateDto.planId) {
        const plan = await this.getSubscriptionPlanById(updateDto.planId);
        if (!plan) {
          throw new NotFoundException('새 구독 계획을 찾을 수 없습니다.');
        }
        updateData.plan_id = updateDto.planId;
        updateData.current_price = plan.price;
      }

      if (updateDto.paymentMethodId) {
        updateData.payment_method_id = updateDto.paymentMethodId;
      }

      if (updateDto.endDate) {
        updateData.end_date = new Date(updateDto.endDate).toISOString();
      }

      if (updateDto.autoRenew !== undefined) {
        updateData.auto_renew = updateDto.autoRenew;
      }

      if (updateDto.deliveryAddressId) {
        updateData.delivery_address_id = updateDto.deliveryAddressId;
      }

      if (updateDto.deliveryTimePreference) {
        updateData.delivery_time_preference = updateDto.deliveryTimePreference;
      }

      if (updateDto.notes) {
        updateData.notes = updateDto.notes;
      }

      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error || !subscription) {
        throw new NotFoundException('구독을 찾을 수 없습니다.');
      }

      this.logger.log(`Subscription updated successfully: ${subscriptionId}`);
      return await this.mapSubscriptionEntityToDto(subscription);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 정기 결제 처리
   */
  async processSubscriptionPayment(subscriptionId: string): Promise<SubscriptionPaymentDto> {
    try {
      this.logger.log(`Processing subscription payment: ${subscriptionId}`);

      const subscription = await this.getSubscriptionById(subscriptionId);
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('활성 상태의 구독만 결제할 수 있습니다.');
      }

      // 결제 레코드 생성
      const paymentData: Partial<SubscriptionPaymentEntity> = {
        subscription_id: subscriptionId,
        amount: subscription.currentPrice,
        status: 'pending',
        attempt_date: new Date().toISOString(),
        billing_cycle: subscription.totalBillingCycles + 1,
        retry_count: 0
      };

      const { data: payment, error } = await this.supabase
        .from('subscription_payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create payment record:', error);
        throw new InternalServerErrorException('결제 레코드 생성에 실패했습니다.');
      }

      try {
        // 실제 결제 처리 (PG사 연동)
        const pgResult = await this.processPGPayment(subscription, payment.id);

        if (pgResult.success) {
          // 결제 성공
          await this.supabase
            .from('subscription_payments')
            .update({
              status: 'completed',
              paid_date: new Date().toISOString(),
              pg_transaction_id: pgResult.transactionId
            })
            .eq('id', payment.id);

          // 구독 정보 업데이트
          await this.updateSubscriptionAfterPayment(subscriptionId, subscription.currentPrice, true);

          // 다음 결제 스케줄링
          await this.scheduleNextPayment(subscriptionId);

        } else {
          // 결제 실패
          await this.supabase
            .from('subscription_payments')
            .update({
              status: 'failed',
              failure_reason: pgResult.errorMessage
            })
            .eq('id', payment.id);

          // 재시도 스케줄링
          await this.schedulePaymentRetry(subscriptionId, payment.id);

          // 구독 정보 업데이트
          await this.updateSubscriptionAfterPayment(subscriptionId, 0, false);
        }
      } catch (pgError) {
        // PG 연동 오류
        await this.supabase
          .from('subscription_payments')
          .update({
            status: 'failed',
            failure_reason: pgError instanceof Error ? pgError.message : 'PG 연동 오류'
          })
          .eq('id', payment.id);
        
        throw pgError;
      }

      // 업데이트된 결제 정보 조회
      const { data: updatedPayment } = await this.supabase
        .from('subscription_payments')
        .select('*')
        .eq('id', payment.id)
        .single();

      return this.mapPaymentEntityToDto(updatedPayment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process subscription payment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 통계 조회
   */
  async getSubscriptionStats(): Promise<SubscriptionStatsDto> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // 병렬로 여러 통계 쿼리 실행
      const [
        totalStats,
        statusStats,
        todayStats,
        revenueStats,
        typeStats,
        intervalStats
      ] = await Promise.all([
        this.getTotalSubscriptionStats(),
        this.getSubscriptionStatsByStatus(),
        this.getTodaySubscriptionStats(todayStart),
        this.getRevenueStats(),
        this.getSubscriptionStatsByType(),
        this.getSubscriptionStatsByInterval()
      ]);

      return {
        totalSubscriptions: totalStats.total,
        activeSubscriptions: statusStats.active || 0,
        pausedSubscriptions: statusStats.paused || 0,
        cancelledSubscriptions: statusStats.cancelled || 0,
        monthlyRecurringRevenue: revenueStats.mrr,
        annualRecurringRevenue: revenueStats.arr,
        averageCustomerLifetimeValue: revenueStats.cltv,
        churnRate: revenueStats.churnRate,
        todayNewSubscriptions: todayStats.new,
        todayCancelledSubscriptions: todayStats.cancelled,
        subscriptionsByType: typeStats,
        subscriptionsByInterval: intervalStats,
        averageSubscriptionDuration: revenueStats.averageDuration,
        generatedAt: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get subscription stats: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 일괄 구독 작업
   */
  async bulkSubscriptionAction(actionDto: BulkSubscriptionActionDto): Promise<{ processed: number; errors: string[] }> {
    try {
      this.logger.log(`Performing bulk action: ${actionDto.action} on ${actionDto.subscriptionIds.length} subscriptions`);

      let processed = 0;
      const errors: string[] = [];

      for (const subscriptionId of actionDto.subscriptionIds) {
        try {
          switch (actionDto.action) {
            case 'pause':
              await this.updateSubscriptionStatus(subscriptionId, {
                status: SubscriptionStatus.PAUSED,
                reason: actionDto.reason,
                pauseDurationDays: actionDto.pauseDurationDays
              });
              break;
            case 'resume':
              await this.updateSubscriptionStatus(subscriptionId, {
                status: SubscriptionStatus.ACTIVE,
                reason: actionDto.reason
              });
              break;
            case 'cancel':
              await this.updateSubscriptionStatus(subscriptionId, {
                status: SubscriptionStatus.CANCELLED,
                reason: actionDto.reason
              });
              break;
            case 'update_plan':
              if (actionDto.newPlanId) {
                await this.updateSubscription(subscriptionId, {
                  planId: actionDto.newPlanId
                });
              }
              break;
          }
          processed++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Subscription ${subscriptionId}: ${errorMsg}`);
        }
      }

      this.logger.log(`Bulk action completed: ${processed} processed, ${errors.length} errors`);
      return { processed, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to perform bulk action: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 구독 갱신 미리보기
   */
  async getSubscriptionRenewalPreview(subscriptionId: string): Promise<SubscriptionRenewalPreviewDto> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      
      // 할인 계산
      const appliedDiscounts = await this.calculateRenewalDiscounts(subscription);
      const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
      const finalAmount = Math.max(0, subscription.currentPrice - totalDiscount);

      // 결제 방법 정보 조회
      const paymentMethod = await this.getPaymentMethodInfo(subscription.id);

      return {
        subscriptionId,
        nextBillingDate: subscription.nextBillingDate || new Date(),
        upcomingAmount: subscription.currentPrice,
        appliedDiscounts,
        finalAmount,
        paymentMethod,
        renewalStatus: finalAmount > 0 ? 'success' : 'pending',
        warnings: this.generateRenewalWarnings(subscription, paymentMethod)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get renewal preview: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  private async getSubscriptionPlanById(planId: string): Promise<SubscriptionPlanEntity | null> {
    const { data: plan, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (error) {
      this.logger.error('Failed to get subscription plan:', error);
      return null;
    }

    return plan;
  }

  private calculateNextBillingDate(currentDate: Date, interval: SubscriptionInterval, intervalCount: number = 1): Date {
    const nextDate = new Date(currentDate);

    switch (interval) {
      case SubscriptionInterval.DAILY:
        nextDate.setDate(nextDate.getDate() + intervalCount);
        break;
      case SubscriptionInterval.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * intervalCount));
        break;
      case SubscriptionInterval.BIWEEKLY:
        nextDate.setDate(nextDate.getDate() + (14 * intervalCount));
        break;
      case SubscriptionInterval.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + intervalCount);
        break;
      case SubscriptionInterval.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + (3 * intervalCount));
        break;
      case SubscriptionInterval.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        break;
    }

    return nextDate;
  }

  private async calculateCouponDiscount(couponId: string, amount: number): Promise<any> {
    // 쿠폰 서비스와 연동하여 할인 계산
    // 실제로는 CouponService를 주입받아 사용
    return {
      couponId,
      discountAmount: amount * 0.1, // 예시: 10% 할인
      discountType: 'percentage'
    };
  }

  private async processSetupFee(subscriptionId: string, setupFee: number): Promise<void> {
    // 설정 요금 즉시 결제 처리
    this.logger.log(`Processing setup fee: ${setupFee} for subscription ${subscriptionId}`);
  }

  private async scheduleNextPayment(subscriptionId: string): Promise<void> {
    // 다음 결제 스케줄링 (크론 작업 또는 큐 시스템 사용)
    this.logger.log(`Scheduling next payment for subscription: ${subscriptionId}`);
  }

  private async schedulePaymentRetry(subscriptionId: string, paymentId: string): Promise<void> {
    // 결제 재시도 스케줄링
    this.logger.log(`Scheduling payment retry for subscription: ${subscriptionId}, payment: ${paymentId}`);
  }

  private async processPGPayment(subscription: SubscriptionResponseDto, paymentId: string): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    // PG사 결제 처리 (실제로는 PaymentGatewayService 사용)
    this.logger.log(`Processing PG payment for subscription: ${subscription.id}`);
    
    // Mock 성공 응답
    return {
      success: true,
      transactionId: `txn_${Date.now()}`
    };
  }

  private async updateSubscriptionAfterPayment(subscriptionId: string, amount: number, success: boolean): Promise<void> {
    const updateData: any = {};

    if (success) {
      updateData.successful_payments = { increment: 1 };
      updateData.total_paid_amount = { increment: amount };
    } else {
      updateData.failed_payments = { increment: 1 };
    }

    updateData.total_billing_cycles = { increment: 1 };

    await this.supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);
  }

  private async recordStatusChange(subscriptionId: string, updateDto: UpdateSubscriptionStatusDto): Promise<void> {
    await this.supabase
      .from('subscription_status_history')
      .insert({
        subscription_id: subscriptionId,
        status: updateDto.status,
        reason: updateDto.reason,
        processed_by: updateDto.processedBy,
        created_at: new Date().toISOString()
      });
  }

  private async mapSubscriptionEntityToDto(entity: SubscriptionEntity): Promise<SubscriptionResponseDto> {
    // 구독 계획 정보 조회
    const plan = await this.getSubscriptionPlanById(entity.plan_id);
    
    return {
      id: entity.id,
      customerId: entity.customer_id,
      plan: plan ? this.mapPlanEntityToDto(plan) : {} as SubscriptionPlanDto,
      status: entity.status,
      currentPrice: entity.current_price,
      nextBillingDate: entity.next_billing_date ? new Date(entity.next_billing_date) : undefined,
      startDate: new Date(entity.start_date),
      endDate: entity.end_date ? new Date(entity.end_date) : undefined,
      trialEndDate: entity.trial_end_date ? new Date(entity.trial_end_date) : undefined,
      createdAt: new Date(entity.created_at),
      cancelledAt: entity.cancelled_at ? new Date(entity.cancelled_at) : undefined,
      pausedAt: entity.paused_at ? new Date(entity.paused_at) : undefined,
      totalBillingCycles: entity.total_billing_cycles,
      successfulPayments: entity.successful_payments,
      failedPayments: entity.failed_payments,
      totalPaidAmount: entity.total_paid_amount,
      discountInfo: entity.discount_info,
      metadata: entity.metadata
    };
  }

  private mapPlanEntityToDto(entity: SubscriptionPlanEntity): SubscriptionPlanDto {
    return {
      name: entity.name,
      description: entity.description,
      type: entity.type,
      price: entity.price,
      interval: entity.interval,
      intervalCount: entity.interval_count,
      trialPeriodDays: entity.trial_period_days,
      setupFee: entity.setup_fee,
      isActive: entity.is_active,
      maxDurationMonths: entity.max_duration_months,
      benefits: entity.benefits,
      restaurantId: entity.restaurant_id
    };
  }

  private mapPaymentEntityToDto(entity: SubscriptionPaymentEntity): SubscriptionPaymentDto {
    return {
      id: entity.id,
      subscriptionId: entity.subscription_id,
      amount: entity.amount,
      status: entity.status,
      attemptDate: new Date(entity.attempt_date),
      paidDate: entity.paid_date ? new Date(entity.paid_date) : undefined,
      billingCycle: entity.billing_cycle,
      pgTransactionId: entity.pg_transaction_id,
      failureReason: entity.failure_reason,
      retryCount: entity.retry_count,
      nextRetryDate: entity.next_retry_date ? new Date(entity.next_retry_date) : undefined
    };
  }

  /**
   * 통계 조회 헬퍼 메서드들
   */
  private async getTotalSubscriptionStats(): Promise<{ total: number }> {
    const { count, error } = await this.supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true });

    return { total: error ? 0 : count || 0 };
  }

  private async getSubscriptionStatsByStatus(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('status');

    if (error || !data) {
      return {};
    }

    const stats: Record<string, number> = {};
    data.forEach(sub => {
      stats[sub.status] = (stats[sub.status] || 0) + 1;
    });

    return stats;
  }

  private async getTodaySubscriptionStats(todayStart: Date): Promise<{ new: number; cancelled: number }> {
    const [newSubs, cancelledSubs] = await Promise.all([
      this.supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      this.supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('cancelled_at', todayStart.toISOString())
        .not('cancelled_at', 'is', null)
    ]);

    return {
      new: newSubs.count || 0,
      cancelled: cancelledSubs.count || 0
    };
  }

  private async getRevenueStats(): Promise<{
    mrr: number;
    arr: number;
    cltv: number;
    churnRate: number;
    averageDuration: number;
  }> {
    // 실제로는 더 복잡한 수익 계산 로직이 필요
    const { data: activeSubs } = await this.supabase
      .from('subscriptions')
      .select('current_price, interval')
      .eq('status', SubscriptionStatus.ACTIVE);

    let mrr = 0;
    if (activeSubs) {
      mrr = activeSubs.reduce((sum, sub) => {
        // 월간 경상 수익으로 변환
        let monthlyAmount = sub.current_price;
        switch (sub.interval) {
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
      }, 0);
    }

    const arr = mrr * 12;
    const cltv = arr * 2; // 예시 계산
    const churnRate = 5; // 예시: 5%
    const averageDuration = 12; // 예시: 12개월

    return { mrr, arr, cltv, churnRate, averageDuration };
  }

  private async getSubscriptionStatsByType(): Promise<Record<SubscriptionType, number>> {
    const stats: Record<SubscriptionType, number> = {
      [SubscriptionType.FOOD_DELIVERY]: 0,
      [SubscriptionType.PREMIUM_SERVICE]: 0,
      [SubscriptionType.MEAL_PLAN]: 0,
      [SubscriptionType.CUSTOM]: 0
    };

    // 실제로는 조인 쿼리 필요
    return stats;
  }

  private async getSubscriptionStatsByInterval(): Promise<Record<SubscriptionInterval, number>> {
    const stats: Record<SubscriptionInterval, number> = {
      [SubscriptionInterval.DAILY]: 0,
      [SubscriptionInterval.WEEKLY]: 0,
      [SubscriptionInterval.BIWEEKLY]: 0,
      [SubscriptionInterval.MONTHLY]: 0,
      [SubscriptionInterval.QUARTERLY]: 0,
      [SubscriptionInterval.YEARLY]: 0
    };

    // 실제로는 조인 쿼리 필요
    return stats;
  }

  private async calculateRenewalDiscounts(subscription: SubscriptionResponseDto): Promise<Array<{
    type: 'coupon' | 'loyalty' | 'promotion';
    name: string;
    discountAmount: number;
  }>> {
    // 갱신 시 적용 가능한 할인 계산
    return [];
  }

  private async getPaymentMethodInfo(subscriptionId: string): Promise<{
    type: string;
    lastFour?: string;
    expiryDate?: string;
  }> {
    // 결제 수단 정보 조회
    return {
      type: 'card',
      lastFour: '1234',
      expiryDate: '12/25'
    };
  }

  private generateRenewalWarnings(subscription: SubscriptionResponseDto, paymentMethod: any): string[] {
    const warnings: string[] = [];

    if (subscription.endDate && subscription.endDate < new Date()) {
      warnings.push('구독이 만료되었습니다.');
    }

    if (subscription.failedPayments > 2) {
      warnings.push('최근 결제 실패가 다수 발생했습니다.');
    }

    if (paymentMethod.expiryDate) {
      const expiry = new Date(paymentMethod.expiryDate);
      const now = new Date();
      if (expiry < now) {
        warnings.push('결제 수단이 만료되었습니다.');
      }
    }

    return warnings;
  }
} 