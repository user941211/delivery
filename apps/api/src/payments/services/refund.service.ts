/**
 * 부분 환불 및 취소 시스템 서비스
 * 
 * 주문 취소 및 부분 환불 처리, PG사 연동을 담당합니다.
 */

import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';

import {
  RefundType,
  RefundStatus,
  RefundReason,
  RefundMethod,
  CreateRefundDto,
  RefundResponseDto,
  GetRefundsQueryDto,
  UpdateRefundStatusDto,
  CheckRefundEligibilityDto,
  RefundEligibilityResponseDto,
  RefundStatsDto,
  AutoRefundConfigDto,
  RefundItemDto
} from '../dto/refund.dto';

/**
 * 환불 엔티티 인터페이스
 */
interface RefundEntity {
  id: string;
  order_id: string;
  type: RefundType;
  status: RefundStatus;
  reason: RefundReason;
  reason_detail?: string;
  original_amount: number;
  refund_amount: number;
  refund_fee: number;
  actual_refund_amount: number;
  refund_items?: RefundItemDto[];
  refund_method: RefundMethod;
  pg_transaction_id?: string;
  pg_refund_id?: string;
  expected_completion_date?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  requested_by?: string;
  processed_by?: string;
  admin_note?: string;
  error_message?: string;
  metadata?: any;
}

/**
 * 주문 엔티티 인터페이스 (환불 처리를 위한 최소 정보)
 */
interface OrderEntity {
  id: string;
  customer_id: string;
  restaurant_id: string;
  total_amount: number;
  payment_amount: number;
  delivery_fee: number;
  discount_amount: number;
  status: string;
  payment_status: string;
  pg_transaction_id?: string;
  created_at: string;
  order_items?: Array<{
    menu_id: string;
    menu_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

/**
 * PG사별 환불 응답 인터페이스
 */
interface PGRefundResponse {
  success: boolean;
  refundId?: string;
  status: string;
  actualAmount?: number;
  errorCode?: string;
  errorMessage?: string;
  completionDate?: Date;
}

/**
 * 부분 환불 및 취소 시스템 서비스 클래스
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private readonly supabase: SupabaseClient;
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly configService: ConfigService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );

    // HTTP 클라이언트 초기화
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 환불 요청 생성
   */
  async createRefund(createRefundDto: CreateRefundDto): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Creating refund for order: ${createRefundDto.orderId}`);

      // 주문 정보 조회 및 검증
      const order = await this.getOrderById(createRefundDto.orderId);
      if (!order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 환불 가능 여부 확인
      const eligibility = await this.checkRefundEligibility({
        orderId: createRefundDto.orderId,
        type: createRefundDto.type,
        refundAmount: createRefundDto.refundAmount
      });

      if (!eligibility.eligible) {
        throw new BadRequestException(`환불이 불가능합니다: ${eligibility.reason}`);
      }

      // 환불 금액 계산
      const refundCalculation = this.calculateRefundAmount(createRefundDto, order);
      
      // 환불 요청 데이터 생성
      const refundData: Partial<RefundEntity> = {
        order_id: createRefundDto.orderId,
        type: createRefundDto.type,
        status: RefundStatus.PENDING,
        reason: createRefundDto.reason,
        reason_detail: createRefundDto.reasonDetail,
        original_amount: order.payment_amount,
        refund_amount: refundCalculation.refundAmount,
        refund_fee: refundCalculation.refundFee,
        actual_refund_amount: refundCalculation.actualRefundAmount,
        refund_items: createRefundDto.refundItems,
        refund_method: createRefundDto.refundMethod || RefundMethod.AUTO,
        pg_transaction_id: order.pg_transaction_id,
        expected_completion_date: this.calculateExpectedCompletionDate().toISOString(),
        requested_at: new Date().toISOString(),
        requested_by: createRefundDto.requestedBy,
        admin_note: createRefundDto.adminNote,
        metadata: {
          originalOrderAmount: order.total_amount,
          deliveryFeeRefunded: createRefundDto.refundDeliveryFee,
          autoProcessed: false
        }
      };

      // 데이터베이스에 환불 요청 저장
      const { data: refund, error } = await this.supabase
        .from('refunds')
        .insert(refundData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create refund:', error);
        throw new InternalServerErrorException('환불 요청 생성에 실패했습니다.');
      }

      // 자동 환불 조건 확인 및 처리
      if (await this.shouldAutoProcess(refund)) {
        await this.processRefundAutomatically(refund.id);
      }

      this.logger.log(`Refund created successfully: ${refund.id}`);
      return this.mapRefundEntityToDto(refund);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 목록 조회
   */
  async getRefunds(query: GetRefundsQueryDto): Promise<{ refunds: RefundResponseDto[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, type, reason, startDate, endDate, minAmount, maxAmount, customerId, restaurantId } = query;

      let dbQuery = this.supabase
        .from('refunds')
        .select(`
          *,
          orders!inner (
            customer_id,
            restaurant_id
          )
        `, { count: 'exact' });

      // 필터 적용
      if (status) {
        dbQuery = dbQuery.eq('status', status);
      }
      if (type) {
        dbQuery = dbQuery.eq('type', type);
      }
      if (reason) {
        dbQuery = dbQuery.eq('reason', reason);
      }
      if (startDate) {
        dbQuery = dbQuery.gte('requested_at', startDate);
      }
      if (endDate) {
        dbQuery = dbQuery.lte('requested_at', endDate);
      }
      if (minAmount) {
        dbQuery = dbQuery.gte('refund_amount', minAmount);
      }
      if (maxAmount) {
        dbQuery = dbQuery.lte('refund_amount', maxAmount);
      }
      if (customerId) {
        dbQuery = dbQuery.eq('orders.customer_id', customerId);
      }
      if (restaurantId) {
        dbQuery = dbQuery.eq('orders.restaurant_id', restaurantId);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      dbQuery = dbQuery
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: refunds, error, count } = await dbQuery;

      if (error) {
        this.logger.error('Failed to get refunds:', error);
        throw new InternalServerErrorException('환불 목록 조회에 실패했습니다.');
      }

      return {
        refunds: (refunds || []).map(refund => this.mapRefundEntityToDto(refund)),
        total: count || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get refunds: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 상세 조회
   */
  async getRefundById(refundId: string): Promise<RefundResponseDto> {
    try {
      const { data: refund, error } = await this.supabase
        .from('refunds')
        .select('*')
        .eq('id', refundId)
        .single();

      if (error || !refund) {
        throw new NotFoundException('환불 내역을 찾을 수 없습니다.');
      }

      return this.mapRefundEntityToDto(refund);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 상태 업데이트
   */
  async updateRefundStatus(refundId: string, updateDto: UpdateRefundStatusDto): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Updating refund status: ${refundId} to ${updateDto.status}`);

      const updateData: Partial<RefundEntity> = {
        status: updateDto.status,
        processed_by: updateDto.processedBy,
        admin_note: updateDto.adminNote,
        error_message: updateDto.errorMessage,
        pg_refund_id: updateDto.pgRefundId
      };

      // 상태에 따른 타임스탬프 업데이트
      if (updateDto.status === RefundStatus.PROCESSING) {
        updateData.processed_at = new Date().toISOString();
      } else if (updateDto.status === RefundStatus.COMPLETED) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: refund, error } = await this.supabase
        .from('refunds')
        .update(updateData)
        .eq('id', refundId)
        .select()
        .single();

      if (error || !refund) {
        throw new NotFoundException('환불 내역을 찾을 수 없습니다.');
      }

      this.logger.log(`Refund status updated successfully: ${refundId}`);
      return this.mapRefundEntityToDto(refund);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update refund status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 가능 여부 확인
   */
  async checkRefundEligibility(checkDto: CheckRefundEligibilityDto): Promise<RefundEligibilityResponseDto> {
    try {
      const order = await this.getOrderById(checkDto.orderId);
      if (!order) {
        return {
          eligible: false,
          reason: '주문을 찾을 수 없습니다.',
          maxRefundableAmount: 0,
          refundFee: 0,
          expectedRefundAmount: 0
        };
      }

      // 이미 환불된 금액 확인
      const { data: existingRefunds } = await this.supabase
        .from('refunds')
        .select('refund_amount')
        .eq('order_id', checkDto.orderId)
        .in('status', [RefundStatus.COMPLETED, RefundStatus.PROCESSING]);

      const totalRefunded = existingRefunds?.reduce((sum, r) => sum + r.refund_amount, 0) || 0;
      const maxRefundableAmount = order.payment_amount - totalRefunded;

      // 기본 검증
      if (order.status === 'cancelled') {
        return {
          eligible: false,
          reason: '이미 취소된 주문입니다.',
          maxRefundableAmount: 0,
          refundFee: 0,
          expectedRefundAmount: 0
        };
      }

      if (maxRefundableAmount <= 0) {
        return {
          eligible: false,
          reason: '더 이상 환불할 수 있는 금액이 없습니다.',
          maxRefundableAmount: 0,
          refundFee: 0,
          expectedRefundAmount: 0
        };
      }

      // 환불 요청 금액 검증
      const requestedAmount = checkDto.refundAmount || maxRefundableAmount;
      if (requestedAmount > maxRefundableAmount) {
        return {
          eligible: false,
          reason: `환불 가능한 최대 금액(${maxRefundableAmount}원)을 초과했습니다.`,
          maxRefundableAmount,
          refundFee: 0,
          expectedRefundAmount: 0
        };
      }

      // 시간 제한 확인 (결제 후 24시간 이내는 수수료 면제)
      const paymentTime = new Date(order.created_at);
      const now = new Date();
      const hoursAfterPayment = (now.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
      
      let refundFee = 0;
      if (hoursAfterPayment > 24 && checkDto.type !== RefundType.ITEM_CANCEL) {
        refundFee = Math.min(requestedAmount * 0.03, 5000); // 3% 수수료, 최대 5,000원
      }

      const expectedRefundAmount = requestedAmount - refundFee;

      // 환불 가능한 아이템 목록 생성
      const refundableItems = order.order_items?.map(item => ({
        menuId: item.menu_id,
        menuName: item.menu_name,
        maxQuantity: item.quantity,
        unitPrice: item.unit_price
      }));

      return {
        eligible: true,
        maxRefundableAmount,
        refundFee,
        expectedRefundAmount,
        refundableItems,
        restrictions: hoursAfterPayment > 72 ? ['72시간이 경과하여 수동 확인이 필요합니다.'] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to check refund eligibility: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 처리 (PG사 연동)
   */
  async processRefund(refundId: string): Promise<RefundResponseDto> {
    try {
      this.logger.log(`Processing refund: ${refundId}`);

      // 환불 정보 조회
      const refund = await this.getRefundById(refundId);
      if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException('처리 가능한 환불 요청이 아닙니다.');
      }

      // 상태를 처리 중으로 변경
      await this.updateRefundStatus(refundId, {
        status: RefundStatus.PROCESSING,
        processedBy: 'system'
      });

      try {
        // PG사 환불 요청
        const pgResponse = await this.requestPGRefund(refund);

        if (pgResponse.success) {
          // 환불 성공
          await this.updateRefundStatus(refundId, {
            status: RefundStatus.COMPLETED,
            pgRefundId: pgResponse.refundId,
            processedBy: 'system'
          });

          // 포인트 환불 처리 (필요한 경우)
          if (refund.refundMethod === RefundMethod.POINT) {
            await this.processPointRefund(refund);
          }

          this.logger.log(`Refund processed successfully: ${refundId}`);
        } else {
          // 환불 실패
          await this.updateRefundStatus(refundId, {
            status: RefundStatus.FAILED,
            errorMessage: pgResponse.errorMessage || 'PG사 환불 처리 실패',
            processedBy: 'system'
          });

          throw new InternalServerErrorException(`환불 처리에 실패했습니다: ${pgResponse.errorMessage}`);
        }
      } catch (pgError) {
        // PG 연동 오류
        await this.updateRefundStatus(refundId, {
          status: RefundStatus.FAILED,
          errorMessage: pgError instanceof Error ? pgError.message : 'PG 연동 오류',
          processedBy: 'system'
        });
        throw pgError;
      }

      return await this.getRefundById(refundId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process refund: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 환불 통계 조회
   */
  async getRefundStats(): Promise<RefundStatsDto> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // 병렬로 여러 통계 쿼리 실행
      const [
        totalStats,
        todayStats,
        pendingStats,
        completedCount,
        failedCount,
        processingTimeStats,
        reasonStats,
        typeStats
      ] = await Promise.all([
        this.getTotalRefundStats(),
        this.getTodayRefundStats(todayStart),
        this.getPendingRefundStats(),
        this.getRefundCountByStatus(RefundStatus.COMPLETED),
        this.getRefundCountByStatus(RefundStatus.FAILED),
        this.getAverageProcessingTime(),
        this.getRefundStatsByReason(),
        this.getRefundStatsByType()
      ]);

      return {
        totalRefunds: totalStats.count,
        totalRefundAmount: totalStats.amount,
        todayRefunds: todayStats.count,
        todayRefundAmount: todayStats.amount,
        pendingRefunds: pendingStats.count,
        pendingRefundAmount: pendingStats.amount,
        completedRefunds: completedCount,
        failedRefunds: failedCount,
        averageProcessingTime: processingTimeStats,
        refundsByReason: reasonStats,
        refundsByType: typeStats,
        generatedAt: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get refund stats: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 자동 환불 설정 업데이트
   */
  async updateAutoRefundConfig(config: AutoRefundConfigDto): Promise<{ message: string }> {
    try {
      // 설정을 데이터베이스에 저장 (실제로는 별도 테이블 또는 캐시 사용)
      const { error } = await this.supabase
        .from('system_configs')
        .upsert({
          key: 'auto_refund_config',
          value: config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        this.logger.error('Failed to update auto refund config:', error);
        throw new InternalServerErrorException('자동 환불 설정 업데이트에 실패했습니다.');
      }

      this.logger.log('Auto refund config updated successfully');
      return { message: '자동 환불 설정이 업데이트되었습니다.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update auto refund config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 주문 정보 조회
   */
  private async getOrderById(orderId: string): Promise<OrderEntity | null> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          menu_id,
          menu_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      this.logger.error('Failed to get order:', error);
      return null;
    }

    return order;
  }

  /**
   * 환불 금액 계산
   */
  private calculateRefundAmount(createRefundDto: CreateRefundDto, order: OrderEntity): {
    refundAmount: number;
    refundFee: number;
    actualRefundAmount: number;
  } {
    let refundAmount = 0;

    switch (createRefundDto.type) {
      case RefundType.FULL:
        refundAmount = order.payment_amount;
        break;
      case RefundType.PARTIAL:
        refundAmount = createRefundDto.refundAmount || 0;
        break;
      case RefundType.ITEM_CANCEL:
        refundAmount = createRefundDto.refundItems?.reduce((sum, item) => sum + item.refundAmount, 0) || 0;
        if (createRefundDto.refundDeliveryFee) {
          refundAmount += order.delivery_fee;
        }
        break;
      case RefundType.DELIVERY_CANCEL:
        refundAmount = order.delivery_fee;
        break;
    }

    // 수수료 계산
    const paymentTime = new Date(order.created_at);
    const now = new Date();
    const hoursAfterPayment = (now.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
    
    let refundFee = 0;
    if (hoursAfterPayment > 24 && createRefundDto.type !== RefundType.ITEM_CANCEL) {
      refundFee = Math.min(refundAmount * 0.03, 5000); // 3% 수수료, 최대 5,000원
    }

    const actualRefundAmount = refundAmount - refundFee;

    return { refundAmount, refundFee, actualRefundAmount };
  }

  /**
   * 예상 완료일 계산
   */
  private calculateExpectedCompletionDate(): Date {
    const now = new Date();
    now.setDate(now.getDate() + 3); // 3일 후
    return now;
  }

  /**
   * 자동 처리 조건 확인
   */
  private async shouldAutoProcess(refund: RefundEntity): Promise<boolean> {
    // 자동 환불 설정 조회
    const { data: config } = await this.supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'auto_refund_config')
      .single();

    if (!config?.value.enabled) {
      return false;
    }

    const autoConfig = config.value as AutoRefundConfigDto;

    // 금액 제한 확인
    if (refund.refund_amount > autoConfig.maxAmount) {
      return false;
    }

    // 허용 사유 확인
    if (autoConfig.allowedReasons?.length && !autoConfig.allowedReasons.includes(refund.reason)) {
      return false;
    }

    return true;
  }

  /**
   * 자동 환불 처리
   */
  private async processRefundAutomatically(refundId: string): Promise<void> {
    try {
      await this.processRefund(refundId);
    } catch (error) {
      this.logger.error(`Auto refund processing failed for ${refundId}:`, error);
    }
  }

  /**
   * PG사 환불 요청
   */
  private async requestPGRefund(refund: RefundResponseDto): Promise<PGRefundResponse> {
    try {
      // 실제로는 PG사별로 다른 API를 호출해야 함
      // 여기서는 예시로 통합된 형태로 구현
      
      const requestData = {
        transactionId: refund.pgTransactionId,
        refundAmount: refund.actualRefundAmount,
        reason: refund.reason,
        merchantRefundId: refund.id
      };

      // 예시: 카카오페이 환불 API 호출
      if (refund.pgTransactionId?.startsWith('kakao_')) {
        return await this.requestKakaoPayRefund(requestData);
      }
      // 예시: 토스페이 환불 API 호출
      else if (refund.pgTransactionId?.startsWith('toss_')) {
        return await this.requestTossPayRefund(requestData);
      }

      // 기본 처리 (Mock)
      return {
        success: true,
        refundId: `refund_${Date.now()}`,
        status: 'completed',
        actualAmount: refund.actualRefundAmount,
        completionDate: new Date()
      };
    } catch (error) {
      this.logger.error('PG refund request failed:', error);
      return {
        success: false,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'PG 연동 오류'
      };
    }
  }

  /**
   * 카카오페이 환불 요청
   */
  private async requestKakaoPayRefund(requestData: any): Promise<PGRefundResponse> {
    try {
      const response = await this.httpClient.post(
        'https://kapi.kakao.com/v1/payment/cancel',
        {
          cid: this.configService.get('KAKAO_CID'),
          tid: requestData.transactionId,
          cancel_amount: requestData.refundAmount,
          cancel_tax_free_amount: 0,
        },
        {
          headers: {
            'Authorization': `KakaoAK ${this.configService.get('KAKAO_ADMIN_KEY')}`,
          },
        }
      );

      return {
        success: true,
        refundId: response.data.tid,
        status: 'completed',
        actualAmount: response.data.amount.total,
        completionDate: new Date(response.data.canceled_at)
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        errorMessage: '카카오페이 환불 처리 실패'
      };
    }
  }

  /**
   * 토스페이 환불 요청
   */
  private async requestTossPayRefund(requestData: any): Promise<PGRefundResponse> {
    try {
      const response = await this.httpClient.post(
        `https://api.tosspayments.com/v1/payments/${requestData.transactionId}/cancel`,
        {
          cancelReason: requestData.reason,
          cancelAmount: requestData.refundAmount,
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.configService.get('TOSS_SECRET_KEY') + ':').toString('base64')}`,
          },
        }
      );

      return {
        success: true,
        refundId: response.data.paymentKey,
        status: 'completed',
        actualAmount: response.data.cancelAmount,
        completionDate: new Date(response.data.canceledAt)
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        errorMessage: '토스페이 환불 처리 실패'
      };
    }
  }

  /**
   * 포인트 환불 처리
   */
  private async processPointRefund(refund: RefundResponseDto): Promise<void> {
    try {
      // 포인트 서비스와 연동하여 포인트로 환불 처리
      // 실제로는 PointsService를 주입받아 사용
      this.logger.log(`Processing point refund for amount: ${refund.actualRefundAmount}`);
    } catch (error) {
      this.logger.error('Point refund processing failed:', error);
    }
  }

  /**
   * 환불 엔티티를 DTO로 변환
   */
  private mapRefundEntityToDto(entity: RefundEntity): RefundResponseDto {
    return {
      id: entity.id,
      orderId: entity.order_id,
      type: entity.type,
      status: entity.status,
      reason: entity.reason,
      reasonDetail: entity.reason_detail,
      originalAmount: entity.original_amount,
      refundAmount: entity.refund_amount,
      refundFee: entity.refund_fee,
      actualRefundAmount: entity.actual_refund_amount,
      refundItems: entity.refund_items,
      refundMethod: entity.refund_method,
      pgTransactionId: entity.pg_transaction_id,
      pgRefundId: entity.pg_refund_id,
      expectedCompletionDate: entity.expected_completion_date ? new Date(entity.expected_completion_date) : undefined,
      requestedAt: new Date(entity.requested_at),
      processedAt: entity.processed_at ? new Date(entity.processed_at) : undefined,
      completedAt: entity.completed_at ? new Date(entity.completed_at) : undefined,
      requestedBy: entity.requested_by,
      processedBy: entity.processed_by,
      adminNote: entity.admin_note,
      errorMessage: entity.error_message,
      metadata: entity.metadata
    };
  }

  /**
   * 통계 조회 헬퍼 메서드들
   */
  private async getTotalRefundStats(): Promise<{ count: number; amount: number }> {
    const { data, error } = await this.supabase
      .from('refunds')
      .select('refund_amount')
      .eq('status', RefundStatus.COMPLETED);

    if (error) {
      return { count: 0, amount: 0 };
    }

    return {
      count: data.length,
      amount: data.reduce((sum, r) => sum + r.refund_amount, 0)
    };
  }

  private async getTodayRefundStats(todayStart: Date): Promise<{ count: number; amount: number }> {
    const { data, error } = await this.supabase
      .from('refunds')
      .select('refund_amount')
      .eq('status', RefundStatus.COMPLETED)
      .gte('completed_at', todayStart.toISOString());

    if (error) {
      return { count: 0, amount: 0 };
    }

    return {
      count: data.length,
      amount: data.reduce((sum, r) => sum + r.refund_amount, 0)
    };
  }

  private async getPendingRefundStats(): Promise<{ count: number; amount: number }> {
    const { data, error } = await this.supabase
      .from('refunds')
      .select('refund_amount')
      .eq('status', RefundStatus.PENDING);

    if (error) {
      return { count: 0, amount: 0 };
    }

    return {
      count: data.length,
      amount: data.reduce((sum, r) => sum + r.refund_amount, 0)
    };
  }

  private async getRefundCountByStatus(status: RefundStatus): Promise<number> {
    const { count, error } = await this.supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    return error ? 0 : count || 0;
  }

  private async getAverageProcessingTime(): Promise<number> {
    const { data, error } = await this.supabase
      .from('refunds')
      .select('requested_at, completed_at')
      .eq('status', RefundStatus.COMPLETED)
      .not('completed_at', 'is', null);

    if (error || !data.length) {
      return 0;
    }

    const totalMinutes = data.reduce((sum, r) => {
      const requested = new Date(r.requested_at);
      const completed = new Date(r.completed_at);
      return sum + (completed.getTime() - requested.getTime()) / (1000 * 60);
    }, 0);

    return Math.round(totalMinutes / data.length);
  }

  private async getRefundStatsByReason(): Promise<Record<RefundReason, number>> {
    const stats: Record<RefundReason, number> = {
      [RefundReason.CUSTOMER_REQUEST]: 0,
      [RefundReason.ITEM_UNAVAILABLE]: 0,
      [RefundReason.STORE_CLOSED]: 0,
      [RefundReason.DELIVERY_FAILED]: 0,
      [RefundReason.PAYMENT_ERROR]: 0,
      [RefundReason.SYSTEM_ERROR]: 0,
      [RefundReason.QUALITY_ISSUE]: 0,
      [RefundReason.WRONG_ORDER]: 0,
      [RefundReason.OTHER]: 0
    };

    const { data, error } = await this.supabase
      .from('refunds')
      .select('reason')
      .eq('status', RefundStatus.COMPLETED);

    if (!error && data) {
      data.forEach(r => {
        if (stats.hasOwnProperty(r.reason)) {
          stats[r.reason]++;
        }
      });
    }

    return stats;
  }

  private async getRefundStatsByType(): Promise<Record<RefundType, number>> {
    const stats: Record<RefundType, number> = {
      [RefundType.FULL]: 0,
      [RefundType.PARTIAL]: 0,
      [RefundType.ITEM_CANCEL]: 0,
      [RefundType.DELIVERY_CANCEL]: 0
    };

    const { data, error } = await this.supabase
      .from('refunds')
      .select('type')
      .eq('status', RefundStatus.COMPLETED);

    if (!error && data) {
      data.forEach(r => {
        if (stats.hasOwnProperty(r.type)) {
          stats[r.type]++;
        }
      });
    }

    return stats;
  }
} 