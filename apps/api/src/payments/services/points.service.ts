/**
 * 포인트 적립 및 사용 시스템 서비스
 * 
 * 포인트 적립, 사용, 관리 및 만료 처리를 담당합니다.
 */

import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  PointTransactionType,
  PointEarnSource,
  PointTransactionStatus,
  PointEarnRuleDto,
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
  ConfirmReservedPointsDto
} from '../dto/points.dto';

/**
 * 포인트 잔액 엔티티 인터페이스
 */
interface PointBalanceEntity {
  customer_id: string;
  total_points: number;
  available_points: number;
  pending_points: number;
  last_updated: string;
  created_at: string;
}

/**
 * 포인트 거래 엔티티 인터페이스
 */
interface PointTransactionEntity {
  id: string;
  customer_id: string;
  type: PointTransactionType;
  points: number;
  balance_before: number;
  balance_after: number;
  status: PointTransactionStatus;
  earn_source?: PointEarnSource;
  order_id?: string;
  restaurant_id?: string;
  description: string;
  expires_at?: string;
  created_at: string;
  metadata?: any;
}

/**
 * 포인트 적립 규칙 엔티티 인터페이스
 */
interface PointEarnRuleEntity {
  id: string;
  name: string;
  source: PointEarnSource;
  earn_rate: number;
  fixed_points: number;
  min_order_amount: number;
  max_earn_points: number;
  is_active: boolean;
  expiry_days?: number;
  restaurant_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 포인트 적립 및 사용 시스템 서비스 클래스
 */
@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);
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
   * 포인트 적립
   */
  async earnPoints(earnPointsDto: EarnPointsDto): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Earning points for customer: ${earnPointsDto.customerId}, points: ${earnPointsDto.points}`);

      // 적립 규칙 확인
      const earnRule = await this.getEarnRuleBySource(earnPointsDto.source, earnPointsDto.restaurantId);
      
      // 적립 포인트 계산 및 검증
      let finalPoints = earnPointsDto.points;
      if (earnRule) {
        finalPoints = this.calculateEarnPoints(earnPointsDto, earnRule);
      }

      if (finalPoints <= 0) {
        throw new BadRequestException('적립할 포인트가 없습니다.');
      }

      // 만료일 계산
      const expiresAt = earnPointsDto.expiresAt ? 
        new Date(earnPointsDto.expiresAt) : 
        this.calculateExpiryDate(earnRule?.expiry_days);

      // 현재 잔액 조회
      const currentBalance = await this.getPointBalance(earnPointsDto.customerId);

      // 포인트 거래 생성
      const transaction = await this.createPointTransaction({
        customerId: earnPointsDto.customerId,
        type: PointTransactionType.EARN,
        points: finalPoints,
        balanceBefore: currentBalance.availablePoints,
        balanceAfter: currentBalance.availablePoints + finalPoints,
        earnSource: earnPointsDto.source,
        orderId: earnPointsDto.orderId,
        restaurantId: earnPointsDto.restaurantId,
        description: earnPointsDto.description || this.getDefaultEarnDescription(earnPointsDto.source),
        expiresAt
      });

      // 포인트 잔액 업데이트
      await this.updatePointBalance(earnPointsDto.customerId, finalPoints);

      this.logger.log(`Points earned successfully: ${finalPoints} points for customer ${earnPointsDto.customerId}`);
      return this.mapTransactionEntityToDto(transaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to earn points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 사용
   */
  async usePoints(usePointsDto: UsePointsDto): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Using points for customer: ${usePointsDto.customerId}, points: ${usePointsDto.points}`);

      // 현재 잔액 확인
      const currentBalance = await this.getPointBalance(usePointsDto.customerId);
      
      if (currentBalance.availablePoints < usePointsDto.points) {
        throw new BadRequestException('사용 가능한 포인트가 부족합니다.');
      }

      // 포인트 거래 생성
      const transaction = await this.createPointTransaction({
        customerId: usePointsDto.customerId,
        type: PointTransactionType.USE,
        points: -usePointsDto.points, // 음수로 저장
        balanceBefore: currentBalance.availablePoints,
        balanceAfter: currentBalance.availablePoints - usePointsDto.points,
        orderId: usePointsDto.orderId,
        description: usePointsDto.description || '포인트 사용'
      });

      // 포인트 잔액 업데이트
      await this.updatePointBalance(usePointsDto.customerId, -usePointsDto.points);

      // 만료 포인트 차감 처리 (FIFO)
      await this.deductExpiredPoints(usePointsDto.customerId, usePointsDto.points);

      this.logger.log(`Points used successfully: ${usePointsDto.points} points for customer ${usePointsDto.customerId}`);
      return this.mapTransactionEntityToDto(transaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to use points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 잔액 조회
   */
  async getPointBalance(customerId: string): Promise<PointBalanceResponseDto> {
    try {
      // 기본 잔액 조회
      const { data: balance, error } = await this.supabase
        .from('point_balances')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error && error.code !== 'PGRST116') { // not found가 아닌 경우
        this.logger.error('Failed to get point balance:', error);
        throw new InternalServerErrorException('포인트 잔액 조회에 실패했습니다.');
      }

      // 잔액이 없으면 초기화
      if (!balance) {
        await this.initializePointBalance(customerId);
        return {
          customerId,
          totalPoints: 0,
          availablePoints: 0,
          expiringPoints: 0,
          pendingPoints: 0,
          lastUpdated: new Date()
        };
      }

      // 만료 예정 포인트 조회
      const expiringData = await this.getExpiringPoints(customerId);

      return {
        customerId: balance.customer_id,
        totalPoints: balance.total_points,
        availablePoints: balance.available_points,
        expiringPoints: expiringData.expiringPoints,
        nextExpiryDate: expiringData.nextExpiryDate,
        pendingPoints: balance.pending_points,
        lastUpdated: new Date(balance.last_updated)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get point balance: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 거래 내역 조회
   */
  async getPointTransactions(
    customerId: string, 
    query: GetPointTransactionsQueryDto
  ): Promise<{ transactions: PointTransactionDto[]; total: number }> {
    try {
      const { page = 1, limit = 20, type, status, startDate, endDate, orderId } = query;

      let dbQuery = this.supabase
        .from('point_transactions')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId);

      // 필터 적용
      if (type) {
        dbQuery = dbQuery.eq('type', type);
      }
      if (status) {
        dbQuery = dbQuery.eq('status', status);
      }
      if (startDate) {
        dbQuery = dbQuery.gte('created_at', startDate);
      }
      if (endDate) {
        dbQuery = dbQuery.lte('created_at', endDate);
      }
      if (orderId) {
        dbQuery = dbQuery.eq('order_id', orderId);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      dbQuery = dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: transactions, error, count } = await dbQuery;

      if (error) {
        this.logger.error('Failed to get point transactions:', error);
        throw new InternalServerErrorException('포인트 거래 내역 조회에 실패했습니다.');
      }

      return {
        transactions: (transactions || []).map(tx => this.mapTransactionEntityToDto(tx)),
        total: count || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get point transactions: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 환불
   */
  async refundPoints(refundPointsDto: RefundPointsDto): Promise<PointTransactionDto> {
    try {
      this.logger.log(`Refunding points for customer: ${refundPointsDto.customerId}, points: ${refundPointsDto.points}`);

      // 원본 거래 확인
      const { data: originalTransaction } = await this.supabase
        .from('point_transactions')
        .select('*')
        .eq('customer_id', refundPointsDto.customerId)
        .eq('order_id', refundPointsDto.originalOrderId)
        .eq('type', PointTransactionType.USE)
        .eq('status', PointTransactionStatus.COMPLETED)
        .single();

      if (!originalTransaction) {
        throw new NotFoundException('환불할 포인트 사용 내역을 찾을 수 없습니다.');
      }

      const refundAmount = Math.min(refundPointsDto.points, Math.abs(originalTransaction.points));

      // 현재 잔액 조회
      const currentBalance = await this.getPointBalance(refundPointsDto.customerId);

      // 환불 거래 생성
      const transaction = await this.createPointTransaction({
        customerId: refundPointsDto.customerId,
        type: PointTransactionType.REFUND,
        points: refundAmount,
        balanceBefore: currentBalance.availablePoints,
        balanceAfter: currentBalance.availablePoints + refundAmount,
        orderId: refundPointsDto.originalOrderId,
        description: `포인트 환불: ${refundPointsDto.reason || '주문 취소'}`,
        metadata: {
          originalTransactionId: originalTransaction.id,
          refundReason: refundPointsDto.reason
        }
      });

      // 포인트 잔액 업데이트
      await this.updatePointBalance(refundPointsDto.customerId, refundAmount);

      this.logger.log(`Points refunded successfully: ${refundAmount} points for customer ${refundPointsDto.customerId}`);
      return this.mapTransactionEntityToDto(transaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to refund points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 만료 처리
   */
  async expirePoints(expirePointsDto: ExpirePointsDto): Promise<PointExpiryResultDto> {
    try {
      const expiryDate = expirePointsDto.expiryDate ? new Date(expirePointsDto.expiryDate) : new Date();
      this.logger.log(`Expiring points up to: ${expiryDate.toISOString()}, dryRun: ${expirePointsDto.dryRun}`);

      let query = this.supabase
        .from('point_transactions')
        .select('*')
        .eq('type', PointTransactionType.EARN)
        .eq('status', PointTransactionStatus.COMPLETED)
        .lte('expires_at', expiryDate.toISOString())
        .is('expires_at', false); // NULL이 아닌 것만

      if (expirePointsDto.customerId) {
        query = query.eq('customer_id', expirePointsDto.customerId);
      }

      const { data: expiredTransactions, error } = await query;

      if (error) {
        this.logger.error('Failed to get expired transactions:', error);
        throw new InternalServerErrorException('만료 포인트 조회에 실패했습니다.');
      }

      if (!expiredTransactions?.length) {
        return {
          processedCustomers: 0,
          totalExpiredPoints: 0,
          expiredTransactions: 0,
          processedAt: new Date()
        };
      }

      // 고객별 그룹화
      const customerGroups = this.groupTransactionsByCustomer(expiredTransactions);
      const customerDetails: Array<{ customerId: string; expiredPoints: number; expiredTransactions: number }> = [];
      let totalExpiredPoints = 0;

      // 실제 만료 처리 (dryRun이 아닌 경우)
      if (!expirePointsDto.dryRun) {
        for (const [customerId, transactions] of customerGroups.entries()) {
          const customerExpiredPoints = transactions.reduce((sum, tx) => sum + tx.points, 0);
          
          // 만료 거래 생성
          const currentBalance = await this.getPointBalance(customerId);
          await this.createPointTransaction({
            customerId,
            type: PointTransactionType.EXPIRE,
            points: -customerExpiredPoints,
            balanceBefore: currentBalance.availablePoints,
            balanceAfter: currentBalance.availablePoints - customerExpiredPoints,
            description: '포인트 만료',
            metadata: {
              expiredTransactionIds: transactions.map(tx => tx.id)
            }
          });

          // 잔액 업데이트
          await this.updatePointBalance(customerId, -customerExpiredPoints);

          // 원본 거래 상태 업데이트
          await this.supabase
            .from('point_transactions')
            .update({ status: PointTransactionStatus.EXPIRED })
            .in('id', transactions.map(tx => tx.id));

          customerDetails.push({
            customerId,
            expiredPoints: customerExpiredPoints,
            expiredTransactions: transactions.length
          });

          totalExpiredPoints += customerExpiredPoints;
        }
      } else {
        // 드라이런 모드: 계산만 수행
        for (const [customerId, transactions] of customerGroups.entries()) {
          const customerExpiredPoints = transactions.reduce((sum, tx) => sum + tx.points, 0);
          customerDetails.push({
            customerId,
            expiredPoints: customerExpiredPoints,
            expiredTransactions: transactions.length
          });
          totalExpiredPoints += customerExpiredPoints;
        }
      }

      this.logger.log(`Points expiry completed: ${totalExpiredPoints} points from ${customerGroups.size} customers`);

      return {
        processedCustomers: customerGroups.size,
        totalExpiredPoints,
        expiredTransactions: expiredTransactions.length,
        processedAt: new Date(),
        customerDetails: customerDetails.slice(0, 100) // 최대 100명까지만
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to expire points: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 포인트 통계 조회
   */
  async getPointStats(): Promise<PointStatsDto> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 병렬로 여러 통계 쿼리 실행
      const [
        earnedStats,
        usedStats,
        expiredStats,
        balanceStats,
        todayEarnedStats,
        todayUsedStats,
        expiring7Stats,
        expiring30Stats
      ] = await Promise.all([
        this.getTransactionStats(PointTransactionType.EARN),
        this.getTransactionStats(PointTransactionType.USE),
        this.getTransactionStats(PointTransactionType.EXPIRE),
        this.getActiveBalanceStats(),
        this.getTodayTransactionStats(PointTransactionType.EARN, todayStart),
        this.getTodayTransactionStats(PointTransactionType.USE, todayStart),
        this.getExpiringPointsStats(sevenDaysLater),
        this.getExpiringPointsStats(thirtyDaysLater)
      ]);

      return {
        totalEarnedPoints: earnedStats.totalPoints,
        totalUsedPoints: Math.abs(usedStats.totalPoints),
        totalExpiredPoints: Math.abs(expiredStats.totalPoints),
        activePoints: balanceStats.totalActivePoints,
        activeCustomers: balanceStats.activeCustomers,
        todayEarned: todayEarnedStats.totalPoints,
        todayUsed: Math.abs(todayUsedStats.totalPoints),
        expiringIn7Days: expiring7Stats,
        expiringIn30Days: expiring30Stats,
        generatedAt: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get point stats: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 내부 메서드들
   */

  /**
   * 적립 규칙 조회
   */
  private async getEarnRuleBySource(source: PointEarnSource, restaurantId?: string): Promise<PointEarnRuleEntity | null> {
    let query = this.supabase
      .from('point_earn_rules')
      .select('*')
      .eq('source', source)
      .eq('is_active', true);

    if (restaurantId) {
      query = query.or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);
    } else {
      query = query.is('restaurant_id', null);
    }

    const { data: rule } = await query.single();
    return rule;
  }

  /**
   * 적립 포인트 계산
   */
  private calculateEarnPoints(earnPointsDto: EarnPointsDto, rule: PointEarnRuleEntity): number {
    const orderAmount = earnPointsDto.orderAmount || 0;

    // 최소 주문 금액 확인
    if (orderAmount < rule.min_order_amount) {
      return 0;
    }

    let earnedPoints = 0;

    // 고정 포인트
    if (rule.fixed_points > 0) {
      earnedPoints = rule.fixed_points;
    }

    // 비율 적립
    if (rule.earn_rate > 0 && orderAmount > 0) {
      earnedPoints += Math.floor((orderAmount * rule.earn_rate) / 100);
    }

    // 최대 적립 포인트 제한
    if (rule.max_earn_points > 0) {
      earnedPoints = Math.min(earnedPoints, rule.max_earn_points);
    }

    return Math.max(earnedPoints, earnPointsDto.points);
  }

  /**
   * 만료일 계산
   */
  private calculateExpiryDate(expiryDays?: number): Date | undefined {
    if (!expiryDays || expiryDays === 0) {
      return undefined; // 무제한
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    return expiryDate;
  }

  /**
   * 포인트 거래 생성
   */
  private async createPointTransaction(data: {
    customerId: string;
    type: PointTransactionType;
    points: number;
    balanceBefore: number;
    balanceAfter: number;
    earnSource?: PointEarnSource;
    orderId?: string;
    restaurantId?: string;
    description: string;
    expiresAt?: Date;
    metadata?: any;
  }): Promise<PointTransactionEntity> {
    const transactionData = {
      customer_id: data.customerId,
      type: data.type,
      points: data.points,
      balance_before: data.balanceBefore,
      balance_after: data.balanceAfter,
      status: PointTransactionStatus.COMPLETED,
      earn_source: data.earnSource,
      order_id: data.orderId,
      restaurant_id: data.restaurantId,
      description: data.description,
      expires_at: data.expiresAt?.toISOString(),
      created_at: new Date().toISOString(),
      metadata: data.metadata
    };

    const { data: transaction, error } = await this.supabase
      .from('point_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create point transaction:', error);
      throw new InternalServerErrorException('포인트 거래 생성에 실패했습니다.');
    }

    return transaction;
  }

  /**
   * 포인트 잔액 업데이트
   */
  private async updatePointBalance(customerId: string, pointChange: number): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_point_balance', {
        customer_id: customerId,
        point_change: pointChange
      });

    if (error) {
      this.logger.error('Failed to update point balance:', error);
      throw new InternalServerErrorException('포인트 잔액 업데이트에 실패했습니다.');
    }
  }

  /**
   * 포인트 잔액 초기화
   */
  private async initializePointBalance(customerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('point_balances')
      .insert({
        customer_id: customerId,
        total_points: 0,
        available_points: 0,
        pending_points: 0,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      this.logger.error('Failed to initialize point balance:', error);
    }
  }

  /**
   * 만료 예정 포인트 조회
   */
  private async getExpiringPoints(customerId: string): Promise<{ expiringPoints: number; nextExpiryDate?: Date }> {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const { data: expiringTransactions } = await this.supabase
      .from('point_transactions')
      .select('points, expires_at')
      .eq('customer_id', customerId)
      .eq('type', PointTransactionType.EARN)
      .eq('status', PointTransactionStatus.COMPLETED)
      .lte('expires_at', thirtyDaysLater.toISOString())
      .is('expires_at', false) // NULL이 아닌 것만
      .order('expires_at', { ascending: true });

    if (!expiringTransactions?.length) {
      return { expiringPoints: 0 };
    }

    const expiringPoints = expiringTransactions.reduce((sum, tx) => sum + tx.points, 0);
    const nextExpiryDate = new Date(expiringTransactions[0].expires_at);

    return { expiringPoints, nextExpiryDate };
  }

  /**
   * 기본 적립 설명 생성
   */
  private getDefaultEarnDescription(source: PointEarnSource): string {
    const descriptions = {
      [PointEarnSource.ORDER_COMPLETION]: '주문 완료 적립',
      [PointEarnSource.FIRST_ORDER]: '첫 주문 보너스',
      [PointEarnSource.REVIEW_WRITE]: '리뷰 작성 적립',
      [PointEarnSource.EVENT]: '이벤트 적립',
      [PointEarnSource.PROMOTION]: '프로모션 적립',
      [PointEarnSource.REFERRAL]: '추천 적립',
      [PointEarnSource.ADMIN_ADJUSTMENT]: '관리자 조정'
    };
    return descriptions[source] || '포인트 적립';
  }

  /**
   * 만료 포인트 차감 (FIFO)
   */
  private async deductExpiredPoints(customerId: string, usedPoints: number): Promise<void> {
    // 실제로는 더 복잡한 FIFO 로직이 필요하지만 여기서는 간소화
    // 사용된 포인트에 대해 가장 먼저 만료되는 포인트부터 차감하는 로직 구현 필요
  }

  /**
   * 포인트 거래 엔티티를 DTO로 변환
   */
  private mapTransactionEntityToDto(transaction: PointTransactionEntity): PointTransactionDto {
    return {
      id: transaction.id,
      customerId: transaction.customer_id,
      type: transaction.type,
      points: transaction.points,
      balanceBefore: transaction.balance_before,
      balanceAfter: transaction.balance_after,
      status: transaction.status,
      earnSource: transaction.earn_source,
      orderId: transaction.order_id,
      restaurantId: transaction.restaurant_id,
      description: transaction.description,
      expiresAt: transaction.expires_at ? new Date(transaction.expires_at) : undefined,
      createdAt: new Date(transaction.created_at),
      metadata: transaction.metadata
    };
  }

  /**
   * 고객별 거래 그룹화
   */
  private groupTransactionsByCustomer(transactions: PointTransactionEntity[]): Map<string, PointTransactionEntity[]> {
    const groups = new Map<string, PointTransactionEntity[]>();
    
    for (const transaction of transactions) {
      if (!groups.has(transaction.customer_id)) {
        groups.set(transaction.customer_id, []);
      }
      groups.get(transaction.customer_id)!.push(transaction);
    }
    
    return groups;
  }

  /**
   * 거래 통계 조회
   */
  private async getTransactionStats(type: PointTransactionType): Promise<{ totalPoints: number }> {
    const { data } = await this.supabase
      .from('point_transactions')
      .select('points')
      .eq('type', type)
      .eq('status', PointTransactionStatus.COMPLETED);

    const totalPoints = (data || []).reduce((sum, tx) => sum + tx.points, 0);
    return { totalPoints };
  }

  /**
   * 활성 잔액 통계 조회
   */
  private async getActiveBalanceStats(): Promise<{ totalActivePoints: number; activeCustomers: number }> {
    const { data } = await this.supabase
      .from('point_balances')
      .select('available_points')
      .gt('available_points', 0);

    const totalActivePoints = (data || []).reduce((sum, balance) => sum + balance.available_points, 0);
    const activeCustomers = (data || []).length;

    return { totalActivePoints, activeCustomers };
  }

  /**
   * 오늘 거래 통계 조회
   */
  private async getTodayTransactionStats(type: PointTransactionType, todayStart: Date): Promise<{ totalPoints: number }> {
    const { data } = await this.supabase
      .from('point_transactions')
      .select('points')
      .eq('type', type)
      .eq('status', PointTransactionStatus.COMPLETED)
      .gte('created_at', todayStart.toISOString());

    const totalPoints = (data || []).reduce((sum, tx) => sum + tx.points, 0);
    return { totalPoints };
  }

  /**
   * 만료 예정 포인트 통계 조회
   */
  private async getExpiringPointsStats(expiryDate: Date): Promise<number> {
    const { data } = await this.supabase
      .from('point_transactions')
      .select('points')
      .eq('type', PointTransactionType.EARN)
      .eq('status', PointTransactionStatus.COMPLETED)
      .lte('expires_at', expiryDate.toISOString())
      .is('expires_at', false); // NULL이 아닌 것만

    return (data || []).reduce((sum, tx) => sum + tx.points, 0);
  }
} 