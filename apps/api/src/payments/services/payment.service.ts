/**
 * 결제 프로세스 관리 서비스
 * 
 * 결제 상태 관리, 주문과의 연동, 결제 이력 저장 등 비즈니스 로직을 처리합니다.
 */

import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TossPaymentsService } from './toss-payments.service';
import { OrderService } from '../../orders/services/order.service';

import {
  CreatePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  TossPaymentResponseDto,
  PaymentHistoryQueryDto,
  PaymentHistoryResponseDto,
  TossPaymentStatus,
  TossPaymentMethod,
  PaymentStatsDto
} from '../dto/payment.dto';

import { 
  PaymentProcessStatus, 
  PaymentEventType, 
  PaymentEventData,
  PaymentValidationResult 
} from '../interfaces/payment-provider.interface';

import { OrderStatus, PaymentStatus } from '../../orders/dto/order.dto';

interface PaymentEntity {
  id: string;
  orderId: string;
  paymentKey: string;
  userId: string;
  amount: number;
  method: string;
  status: TossPaymentStatus;
  processStatus: PaymentProcessStatus;
  tossPaymentData: any;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
}

interface PaymentEventEntity {
  id: string;
  paymentId: string;
  eventType: PaymentEventType;
  eventData: any;
  processedAt: Date;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly tossPaymentsService: TossPaymentsService,
    private readonly orderService: OrderService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 결제 요청 생성
   * 주문 기반으로 결제를 생성하고 결제창 정보를 반환합니다.
   */
  async createPayment(createPaymentDto: CreatePaymentDto, userId: string): Promise<{
    paymentKey: string;
    checkoutUrl: string;
    orderId: string;
    amount: number;
  }> {
    try {
      this.logger.log(`Creating payment for order: ${createPaymentDto.orderId} by user: ${userId}`);

      // 1. 주문 검증
      const order = await this.validateOrderForPayment(createPaymentDto.orderId, userId);

      // 2. 결제 금액 검증
      this.validatePaymentAmount(createPaymentDto.amount, order.totalAmount);

      // 3. 중복 결제 방지
      await this.preventDuplicatePayment(createPaymentDto.orderId);

      // 4. 토스페이먼츠 결제 요청 생성
      const tossPaymentResult = await this.tossPaymentsService.createPayment(createPaymentDto);

      // 5. 로컬 데이터베이스에 결제 정보 저장
      const paymentEntity = await this.savePaymentRequest(
        createPaymentDto,
        userId,
        tossPaymentResult.paymentKey,
        order
      );

      // 6. 결제 이벤트 로깅
      await this.logPaymentEvent(paymentEntity.id, PaymentEventType.PAYMENT_CONFIRMED, {
        action: 'payment_request_created',
        orderId: createPaymentDto.orderId,
        amount: createPaymentDto.amount,
        paymentKey: tossPaymentResult.paymentKey
      });

      this.logger.log(`Payment creation successful: ${tossPaymentResult.paymentKey}`);

      return tossPaymentResult;
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
  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Confirming payment: ${confirmPaymentDto.paymentKey}`);

      // 1. 로컬 결제 정보 조회
      const paymentEntity = await this.getPaymentByKey(confirmPaymentDto.paymentKey);

      // 2. 결제 상태 검증
      this.validatePaymentForConfirmation(paymentEntity);

      // 3. 결제 금액 검증
      if (paymentEntity.amount !== confirmPaymentDto.amount) {
        throw new BadRequestException('결제 금액이 일치하지 않습니다.');
      }

      // 4. 토스페이먼츠 결제 승인
      const tossPaymentResult = await this.tossPaymentsService.confirmPayment(confirmPaymentDto);

      // 5. 로컬 데이터베이스 업데이트
      await this.updatePaymentConfirmation(paymentEntity.id, tossPaymentResult);

      // 6. 주문 상태 업데이트
      await this.updateOrderPaymentStatus(paymentEntity.orderId, PaymentStatus.COMPLETED);

      // 7. 결제 완료 이벤트 로깅
      await this.logPaymentEvent(paymentEntity.id, PaymentEventType.PAYMENT_CONFIRMED, tossPaymentResult);

      this.logger.log(`Payment confirmation successful: ${confirmPaymentDto.paymentKey}`);

      return tossPaymentResult;
    } catch (error) {
      this.logger.error('Payment confirmation failed:', error);

      // 실패한 결제 정보 업데이트
      if (confirmPaymentDto.paymentKey) {
        await this.handlePaymentFailure(confirmPaymentDto.paymentKey, error);
      }

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
  async cancelPayment(paymentKey: string, cancelPaymentDto: CancelPaymentDto): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Canceling payment: ${paymentKey}`);

      // 1. 로컬 결제 정보 조회
      const paymentEntity = await this.getPaymentByKey(paymentKey);

      // 2. 취소 가능 상태 검증
      this.validatePaymentForCancellation(paymentEntity);

      // 3. 토스페이먼츠 결제 취소
      const tossPaymentResult = await this.tossPaymentsService.cancelPayment(paymentKey, cancelPaymentDto);

      // 4. 로컬 데이터베이스 업데이트
      await this.updatePaymentCancellation(paymentEntity.id, tossPaymentResult, cancelPaymentDto.cancelReason);

      // 5. 주문 상태 업데이트
      if (tossPaymentResult.status === TossPaymentStatus.CANCELED) {
        await this.updateOrderPaymentStatus(paymentEntity.orderId, PaymentStatus.CANCELLED);
      } else if (tossPaymentResult.status === TossPaymentStatus.PARTIAL_CANCELED) {
        // 부분 취소의 경우 주문 상태는 유지
      }

      // 6. 결제 취소 이벤트 로깅
      await this.logPaymentEvent(paymentEntity.id, PaymentEventType.PAYMENT_CANCELLED, tossPaymentResult);

      this.logger.log(`Payment cancellation successful: ${paymentKey}`);

      return tossPaymentResult;
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
  async getPayment(paymentKey: string, userId?: string): Promise<TossPaymentResponseDto> {
    try {
      const paymentEntity = await this.getPaymentByKey(paymentKey);

      // 사용자 권한 확인
      if (userId && paymentEntity.userId !== userId) {
        throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
      }

      // 토스페이먼츠에서 최신 정보 조회
      const tossPaymentData = await this.tossPaymentsService.getPayment(paymentKey);

      // 로컬 데이터베이스 동기화
      await this.syncPaymentStatus(paymentEntity.id, tossPaymentData);

      return tossPaymentData;
    } catch (error) {
      this.logger.error('Payment fetch failed:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 주문 ID로 결제 정보 조회
   */
  async getPaymentByOrderId(orderId: string, userId?: string): Promise<TossPaymentResponseDto> {
    try {
      const paymentEntity = await this.getPaymentByOrder(orderId);

      // 사용자 권한 확인
      if (userId && paymentEntity.userId !== userId) {
        throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
      }

      return await this.getPayment(paymentEntity.paymentKey, userId);
    } catch (error) {
      this.logger.error('Payment fetch by order ID failed:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문의 결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 결제 이력 조회
   */
  async getPaymentHistory(queryDto: PaymentHistoryQueryDto, userId?: string): Promise<PaymentHistoryResponseDto> {
    try {
      const { page = 1, limit = 20, status, method, startDate, endDate } = queryDto;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 사용자별 필터링
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // 상태 필터링
      if (status) {
        query = query.eq('status', status);
      }

      // 결제 방법 필터링
      if (method) {
        query = query.eq('method', method);
      }

      // 날짜 필터링
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: payments, error } = await query;

      if (error) {
        throw new InternalServerErrorException('결제 이력 조회 중 오류가 발생했습니다.');
      }

      // 총 개수 조회
      let countQuery = this.supabase
        .from('payments')
        .select('id', { count: 'exact', head: true });

      if (userId) countQuery = countQuery.eq('user_id', userId);
      if (status) countQuery = countQuery.eq('status', status);
      if (method) countQuery = countQuery.eq('method', method);
      if (startDate) countQuery = countQuery.gte('created_at', startDate);
      if (endDate) countQuery = countQuery.lte('created_at', endDate);

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new InternalServerErrorException('결제 개수 조회 중 오류가 발생했습니다.');
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // 토스페이먼츠 데이터로 변환
      const paymentResponses = payments.map(payment => this.transformPaymentEntityToResponse(payment));

      return {
        payments: paymentResponses,
        totalCount,
        currentPage: page,
        totalPages,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };
    } catch (error) {
      this.logger.error('Payment history fetch failed:', error);
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('결제 이력 조회에 실패했습니다.');
    }
  }

  /**
   * 웹훅 처리
   * 토스페이먼츠에서 전송하는 웹훅을 처리합니다.
   */
  async handleWebhook(signature: string, payload: string): Promise<void> {
    try {
      this.logger.log('Processing payment webhook');

      // 1. 웹훅 서명 검증
      const isValidSignature = this.tossPaymentsService.verifyWebhookSignature(signature, payload);
      if (!isValidSignature) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // 2. 웹훅 데이터 파싱
      const webhookData = JSON.parse(payload);
      const eventType = webhookData.eventType;
      const paymentData = webhookData.data;

      // 3. 로컬 결제 정보 조회
      const paymentEntity = await this.getPaymentByKey(paymentData.paymentKey);

      // 4. 이벤트 타입별 처리
      await this.processWebhookEvent(eventType, paymentEntity, paymentData);

      this.logger.log(`Webhook processed successfully: ${eventType}`);
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * 결제 통계 조회
   */
  async getPaymentStats(startDate?: string, endDate?: string, userId?: string): Promise<PaymentStatsDto> {
    try {
      let query = this.supabase
        .from('payments')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: payments, error } = await query;

      if (error) {
        throw new InternalServerErrorException('결제 통계 조회 중 오류가 발생했습니다.');
      }

      const totalPayments = payments.length;
      const successfulPayments = payments.filter(p => p.status === TossPaymentStatus.DONE).length;
      const failedPayments = payments.filter(p => p.status === TossPaymentStatus.ABORTED).length;
      const canceledPayments = payments.filter(p => 
        p.status === TossPaymentStatus.CANCELED || p.status === TossPaymentStatus.PARTIAL_CANCELED
      ).length;

      const totalAmount = payments
        .filter(p => p.status === TossPaymentStatus.DONE)
        .reduce((sum, p) => sum + p.amount, 0);

      const averageAmount = successfulPayments > 0 ? totalAmount / successfulPayments : 0;
      const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

      // 결제 방법별 통계
      const cardPayments = payments.filter(p => p.method === TossPaymentMethod.CARD).length;
      const easyPayPayments = payments.filter(p => p.method === TossPaymentMethod.SIMPLE_PAY).length;
      const virtualAccountPayments = payments.filter(p => p.method === TossPaymentMethod.VIRTUAL_ACCOUNT).length;

      const cardPaymentRate = totalPayments > 0 ? (cardPayments / totalPayments) * 100 : 0;
      const easyPayRate = totalPayments > 0 ? (easyPayPayments / totalPayments) * 100 : 0;
      const virtualAccountRate = totalPayments > 0 ? (virtualAccountPayments / totalPayments) * 100 : 0;

      return {
        totalPayments,
        successfulPayments,
        failedPayments,
        canceledPayments,
        totalAmount,
        averageAmount,
        successRate,
        cardPaymentRate,
        easyPayRate,
        virtualAccountRate
      };
    } catch (error) {
      this.logger.error('Payment stats fetch failed:', error);
      throw new InternalServerErrorException('결제 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  /**
   * 주문 결제 검증
   */
  private async validateOrderForPayment(orderId: string, userId: string): Promise<any> {
    const order = await this.orderService.getOrderById(orderId, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('결제할 수 없는 주문 상태입니다.');
    }

    if (order.payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('이미 결제가 처리된 주문입니다.');
    }

    return order;
  }

  /**
   * 결제 금액 검증
   */
  private validatePaymentAmount(requestAmount: number, orderAmount: number): void {
    if (Math.abs(requestAmount - orderAmount) > 0.01) {
      throw new BadRequestException('결제 금액이 주문 금액과 일치하지 않습니다.');
    }
  }

  /**
   * 중복 결제 방지
   */
  private async preventDuplicatePayment(orderId: string): Promise<void> {
    const { data: existingPayment, error } = await this.supabase
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .neq('status', TossPaymentStatus.ABORTED)
      .neq('status', TossPaymentStatus.CANCELED)
      .single();

    if (!error && existingPayment) {
      throw new BadRequestException('이미 진행 중인 결제가 있습니다.');
    }
  }

  /**
   * 결제 요청 저장
   */
  private async savePaymentRequest(
    createPaymentDto: CreatePaymentDto,
    userId: string,
    paymentKey: string,
    order: any
  ): Promise<PaymentEntity> {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .insert({
        order_id: createPaymentDto.orderId,
        payment_key: paymentKey,
        user_id: userId,
        amount: createPaymentDto.amount,
        method: createPaymentDto.method,
        status: TossPaymentStatus.READY,
        process_status: PaymentProcessStatus.CREATED,
        toss_payment_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('결제 정보 저장에 실패했습니다.');
    }

    return this.mapPaymentEntityFromDb(payment);
  }

  /**
   * 결제 키로 결제 정보 조회
   */
  private async getPaymentByKey(paymentKey: string): Promise<PaymentEntity> {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('payment_key', paymentKey)
      .single();

    if (error || !payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    return this.mapPaymentEntityFromDb(payment);
  }

  /**
   * 주문 ID로 결제 정보 조회
   */
  private async getPaymentByOrder(orderId: string): Promise<PaymentEntity> {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !payment) {
      throw new NotFoundException('주문의 결제 정보를 찾을 수 없습니다.');
    }

    return this.mapPaymentEntityFromDb(payment);
  }

  /**
   * 결제 승인 검증
   */
  private validatePaymentForConfirmation(payment: PaymentEntity): void {
    if (payment.status !== TossPaymentStatus.READY) {
      throw new BadRequestException('승인할 수 없는 결제 상태입니다.');
    }

    if (payment.processStatus !== PaymentProcessStatus.CREATED) {
      throw new BadRequestException('이미 처리된 결제입니다.');
    }
  }

  /**
   * 결제 취소 검증
   */
  private validatePaymentForCancellation(payment: PaymentEntity): void {
    const cancellableStatuses = [TossPaymentStatus.DONE, TossPaymentStatus.PARTIAL_CANCELED];
    if (!cancellableStatuses.includes(payment.status)) {
      throw new BadRequestException('취소할 수 없는 결제 상태입니다.');
    }
  }

  /**
   * 결제 승인 업데이트
   */
  private async updatePaymentConfirmation(paymentId: string, tossPaymentData: TossPaymentResponseDto): Promise<void> {
    await this.supabase
      .from('payments')
      .update({
        status: tossPaymentData.status,
        process_status: PaymentProcessStatus.CONFIRMED,
        toss_payment_data: tossPaymentData,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);
  }

  /**
   * 결제 취소 업데이트
   */
  private async updatePaymentCancellation(paymentId: string, tossPaymentData: TossPaymentResponseDto, reason: string): Promise<void> {
    await this.supabase
      .from('payments')
      .update({
        status: tossPaymentData.status,
        process_status: PaymentProcessStatus.CANCELLED,
        toss_payment_data: tossPaymentData,
        failure_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);
  }

  /**
   * 주문 결제 상태 업데이트
   */
  private async updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
    try {
      // OrderService의 상태 업데이트 메서드를 호출
      // 실제로는 주문 상태도 함께 업데이트해야 함
      this.logger.log(`Updating order payment status: ${orderId} -> ${paymentStatus}`);
      
      // 주문 서비스를 통해 결제 상태 업데이트 (실제 구현 필요)
      // await this.orderService.updatePaymentStatus(orderId, paymentStatus);
    } catch (error) {
      this.logger.error('Order payment status update failed:', error);
      // 결제는 성공했지만 주문 상태 업데이트 실패 시 별도 처리 필요
    }
  }

  /**
   * 결제 실패 처리
   */
  private async handlePaymentFailure(paymentKey: string, error: any): Promise<void> {
    try {
      const failureReason = error instanceof Error ? error.message : '알 수 없는 오류';

      await this.supabase
        .from('payments')
        .update({
          status: TossPaymentStatus.ABORTED,
          process_status: PaymentProcessStatus.FAILED,
          failure_reason: failureReason,
          updated_at: new Date().toISOString()
        })
        .eq('payment_key', paymentKey);

      // 실패 이벤트 로깅
      const payment = await this.getPaymentByKey(paymentKey);
      await this.logPaymentEvent(payment.id, PaymentEventType.PAYMENT_FAILED, { error: failureReason });
    } catch (updateError) {
      this.logger.error('Payment failure update failed:', updateError);
    }
  }

  /**
   * 결제 상태 동기화
   */
  private async syncPaymentStatus(paymentId: string, tossPaymentData: TossPaymentResponseDto): Promise<void> {
    await this.supabase
      .from('payments')
      .update({
        status: tossPaymentData.status,
        toss_payment_data: tossPaymentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);
  }

  /**
   * 결제 이벤트 로깅
   */
  private async logPaymentEvent(paymentId: string, eventType: PaymentEventType, eventData: any): Promise<void> {
    try {
      await this.supabase
        .from('payment_events')
        .insert({
          payment_id: paymentId,
          event_type: eventType,
          event_data: eventData,
          processed_at: new Date().toISOString()
        });
    } catch (error) {
      this.logger.error('Payment event logging failed:', error);
    }
  }

  /**
   * 웹훅 이벤트 처리
   */
  private async processWebhookEvent(eventType: string, payment: PaymentEntity, paymentData: any): Promise<void> {
    switch (eventType) {
      case PaymentEventType.PAYMENT_CONFIRMED:
        await this.updatePaymentConfirmation(payment.id, paymentData);
        await this.updateOrderPaymentStatus(payment.orderId, PaymentStatus.COMPLETED);
        break;

      case PaymentEventType.PAYMENT_FAILED:
        await this.handlePaymentFailure(payment.paymentKey, new Error(paymentData.failure?.message || 'Payment failed'));
        break;

      case PaymentEventType.PAYMENT_CANCELLED:
        await this.updatePaymentCancellation(payment.id, paymentData, 'Webhook cancellation');
        await this.updateOrderPaymentStatus(payment.orderId, PaymentStatus.CANCELLED);
        break;

      case PaymentEventType.VIRTUAL_ACCOUNT_DEPOSIT:
        await this.updatePaymentConfirmation(payment.id, paymentData);
        await this.updateOrderPaymentStatus(payment.orderId, PaymentStatus.COMPLETED);
        break;

      default:
        this.logger.warn(`Unknown webhook event type: ${eventType}`);
    }

    // 이벤트 로깅
    await this.logPaymentEvent(payment.id, eventType as PaymentEventType, paymentData);
  }

  /**
   * 데이터베이스 엔티티 매핑
   */
  private mapPaymentEntityFromDb(dbPayment: any): PaymentEntity {
    return {
      id: dbPayment.id,
      orderId: dbPayment.order_id,
      paymentKey: dbPayment.payment_key,
      userId: dbPayment.user_id,
      amount: dbPayment.amount,
      method: dbPayment.method,
      status: dbPayment.status,
      processStatus: dbPayment.process_status,
      tossPaymentData: dbPayment.toss_payment_data,
      failureReason: dbPayment.failure_reason,
      createdAt: new Date(dbPayment.created_at),
      updatedAt: new Date(dbPayment.updated_at),
      confirmedAt: dbPayment.confirmed_at ? new Date(dbPayment.confirmed_at) : undefined,
      cancelledAt: dbPayment.cancelled_at ? new Date(dbPayment.cancelled_at) : undefined,
    };
  }

  /**
   * 응답 DTO 변환
   */
  private transformPaymentEntityToResponse(payment: PaymentEntity): TossPaymentResponseDto {
    return payment.tossPaymentData || {
      version: '2022-11-16',
      paymentKey: payment.paymentKey,
      type: 'NORMAL',
      orderId: payment.orderId,
      orderName: '',
      mId: '',
      currency: 'KRW',
      method: payment.method,
      totalAmount: payment.amount,
      balanceAmount: payment.amount,
      status: payment.status,
      requestedAt: payment.createdAt.toISOString(),
      approvedAt: payment.confirmedAt?.toISOString(),
    };
  }
} 