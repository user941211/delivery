/**
 * 토스페이먼츠 API 연동 서비스
 * 
 * 토스페이먼츠 REST API와의 모든 통신을 처리하는 서비스입니다.
 */

import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';

import { PaymentProviderInterface, TossPaymentsConfig, PaymentError } from '../interfaces/payment-provider.interface';
import {
  CreatePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  TossPaymentResponseDto,
  PaymentHistoryQueryDto,
  PaymentHistoryResponseDto,
  TossPaymentStatus
} from '../dto/payment.dto';

@Injectable()
export class TossPaymentsService implements PaymentProviderInterface {
  private readonly logger = new Logger(TossPaymentsService.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: TossPaymentsConfig;

  constructor(private readonly configService: ConfigService) {
    // 토스페이먼츠 설정 초기화
    this.config = {
      clientKey: this.configService.get<string>('TOSS_PAYMENTS_CLIENT_KEY') || '',
      secretKey: this.configService.get<string>('TOSS_PAYMENTS_SECRET_KEY') || '',
      baseUrl: this.configService.get<string>('TOSS_PAYMENTS_BASE_URL') || 'https://api.tosspayments.com',
      isTestMode: this.configService.get<boolean>('TOSS_PAYMENTS_TEST_MODE') || true,
      webhookEndpointSecret: this.configService.get<string>('TOSS_PAYMENTS_WEBHOOK_SECRET')
    };

    // HTTP 클라이언트 설정
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터 - 인증 헤더 추가
    this.httpClient.interceptors.request.use(
      (config) => {
        const encodedAuth = Buffer.from(`${this.config.secretKey}:`).toString('base64');
        config.headers.Authorization = `Basic ${encodedAuth}`;
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터 - 에러 처리
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('HTTP Error:', {
          status: error.response?.status,
          data: error.response?.data,
          config: {
            method: error.config?.method,
            url: error.config?.url,
          },
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * 결제 요청 생성
   * 토스페이먼츠 결제창을 위한 결제 정보를 생성합니다.
   */
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<{
    paymentKey: string;
    checkoutUrl: string;
    orderId: string;
    amount: number;
  }> {
    try {
      this.logger.log(`Creating payment for order: ${createPaymentDto.orderId}`);

      // 토스페이먼츠는 결제 요청 시 별도 API 호출 없이 클라이언트에서 직접 처리
      // 여기서는 결제 요청 정보를 검증하고 필요한 데이터를 반환
      
      // 결제 금액 및 주문 정보 검증
      await this.validatePaymentRequest(createPaymentDto);

      // 임시 결제 키 생성 (실제로는 토스페이먼츠에서 생성)
      const paymentKey = this.generatePaymentKey();

      // 결제창 URL 생성
      const checkoutUrl = this.buildCheckoutUrl(createPaymentDto, paymentKey);

      this.logger.log(`Payment creation successful for order: ${createPaymentDto.orderId}`);

      return {
        paymentKey,
        checkoutUrl,
        orderId: createPaymentDto.orderId,
        amount: createPaymentDto.amount,
      };
    } catch (error) {
      this.logger.error('Payment creation failed:', error);
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

      const response: AxiosResponse<TossPaymentResponseDto> = await this.httpClient.post(
        '/v1/payments/confirm',
        {
          paymentKey: confirmPaymentDto.paymentKey,
          orderId: confirmPaymentDto.orderId,
          amount: confirmPaymentDto.amount,
        }
      );

      this.logger.log(`Payment confirmation successful: ${confirmPaymentDto.paymentKey}`);
      return response.data;
    } catch (error) {
      this.logger.error('Payment confirmation failed:', error);
      throw this.handlePaymentError(error, '결제 승인에 실패했습니다.');
    }
  }

  /**
   * 결제 취소/환불 처리
   * 완료된 결제에 대해 전체 또는 부분 취소를 진행합니다.
   */
  async cancelPayment(paymentKey: string, cancelPaymentDto: CancelPaymentDto): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Canceling payment: ${paymentKey}`);

      const requestBody: any = {
        cancelReason: cancelPaymentDto.cancelReason,
      };

      // 부분 취소인 경우 취소 금액 추가
      if (cancelPaymentDto.cancelAmount) {
        requestBody.cancelAmount = cancelPaymentDto.cancelAmount;
      }

      // 환불 계좌 정보가 있는 경우 추가
      if (cancelPaymentDto.refundReceiveAccount) {
        requestBody.refundReceiveAccount = {
          bank: cancelPaymentDto.refundReceiveAccount,
          accountNumber: cancelPaymentDto.refundReceiveAccountNumber,
          holderName: cancelPaymentDto.refundReceiveAccountHolderName,
        };
      }

      const response: AxiosResponse<TossPaymentResponseDto> = await this.httpClient.post(
        `/v1/payments/${paymentKey}/cancel`,
        requestBody
      );

      this.logger.log(`Payment cancellation successful: ${paymentKey}`);
      return response.data;
    } catch (error) {
      this.logger.error('Payment cancellation failed:', error);
      throw this.handlePaymentError(error, '결제 취소에 실패했습니다.');
    }
  }

  /**
   * 결제 정보 조회
   * 결제 키로 결제 상세 정보를 조회합니다.
   */
  async getPayment(paymentKey: string): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Fetching payment: ${paymentKey}`);

      const response: AxiosResponse<TossPaymentResponseDto> = await this.httpClient.get(
        `/v1/payments/${paymentKey}`
      );

      return response.data;
    } catch (error) {
      this.logger.error('Payment fetch failed:', error);
      throw this.handlePaymentError(error, '결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 주문 ID로 결제 정보 조회
   * 주문 ID로 해당 주문의 결제 정보를 조회합니다.
   */
  async getPaymentByOrderId(orderId: string): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Fetching payment by order ID: ${orderId}`);

      const response: AxiosResponse<TossPaymentResponseDto> = await this.httpClient.get(
        `/v1/payments/orders/${orderId}`
      );

      return response.data;
    } catch (error) {
      this.logger.error('Payment fetch by order ID failed:', error);
      throw this.handlePaymentError(error, '주문의 결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 결제 이력 조회 (관리자용)
   * 특정 조건으로 결제 이력을 조회합니다.
   */
  async getPaymentHistory(queryDto: PaymentHistoryQueryDto): Promise<PaymentHistoryResponseDto> {
    try {
      this.logger.log('Fetching payment history');

      // 토스페이먼츠는 결제 이력 조회 API가 제한적이므로
      // 실제로는 로컬 데이터베이스에서 조회하는 것이 일반적
      // 여기서는 기본 구조만 제공
      
      const params: any = {
        limit: queryDto.limit || 20,
        startingAfter: queryDto.page ? (queryDto.page - 1) * (queryDto.limit || 20) : undefined,
      };

      if (queryDto.startDate) {
        params.requestedAtGte = queryDto.startDate;
      }
      if (queryDto.endDate) {
        params.requestedAtLte = queryDto.endDate;
      }

      // 실제 구현에서는 토스페이먼츠 API 제한으로 인해
      // 로컬 데이터베이스 조회로 대체하는 것이 좋습니다.
      const response = await this.httpClient.get('/v1/payments', { params });

      return {
        payments: response.data.data || [],
        totalCount: response.data.totalCount || 0,
        currentPage: queryDto.page || 1,
        totalPages: Math.ceil((response.data.totalCount || 0) / (queryDto.limit || 20)),
        limit: queryDto.limit || 20,
        hasNext: response.data.hasMore || false,
        hasPrevious: (queryDto.page || 1) > 1,
      };
    } catch (error) {
      this.logger.error('Payment history fetch failed:', error);
      throw this.handlePaymentError(error, '결제 이력 조회에 실패했습니다.');
    }
  }

  /**
   * 웹훅 서명 검증
   * 토스페이먼츠에서 전송하는 웹훅의 서명을 검증합니다.
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    try {
      if (!this.config.webhookEndpointSecret) {
        this.logger.warn('Webhook endpoint secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookEndpointSecret)
        .update(payload)
        .digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * 결제 상태 동기화
   * 토스페이먼츠의 실제 상태와 로컬 데이터베이스 상태를 동기화합니다.
   */
  async syncPaymentStatus(paymentKey: string): Promise<TossPaymentResponseDto> {
    try {
      this.logger.log(`Syncing payment status: ${paymentKey}`);

      // 토스페이먼츠에서 최신 결제 정보 조회
      const paymentData = await this.getPayment(paymentKey);

      this.logger.log(`Payment status synced: ${paymentKey} -> ${paymentData.status}`);
      return paymentData;
    } catch (error) {
      this.logger.error('Payment status sync failed:', error);
      throw this.handlePaymentError(error, '결제 상태 동기화에 실패했습니다.');
    }
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  /**
   * 결제 요청 검증
   */
  private async validatePaymentRequest(createPaymentDto: CreatePaymentDto): Promise<void> {
    // 결제 금액 검증
    if (createPaymentDto.amount < 100) {
      throw new BadRequestException('결제 금액은 최소 100원 이상이어야 합니다.');
    }

    // 주문 ID 중복 검증 (실제로는 데이터베이스에서 확인)
    // if (await this.isOrderIdExists(createPaymentDto.orderId)) {
    //   throw new BadRequestException('이미 존재하는 주문 ID입니다.');
    // }

    // 이메일 형식 검증 (DTO에서 이미 검증되지만 추가 검증)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createPaymentDto.customerEmail)) {
      throw new BadRequestException('올바른 이메일 형식을 입력해주세요.');
    }
  }

  /**
   * 임시 결제 키 생성
   */
  private generatePaymentKey(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `payment_${timestamp}_${random}`;
  }

  /**
   * 결제창 URL 생성
   */
  private buildCheckoutUrl(createPaymentDto: CreatePaymentDto, paymentKey: string): string {
    const baseCheckoutUrl = this.config.isTestMode
      ? 'https://sandbox-api.tosspayments.com/v1/payments'
      : 'https://api.tosspayments.com/v1/payments';

    // 실제로는 토스페이먼츠 SDK를 통해 클라이언트에서 결제창을 호출
    // 여기서는 데모 목적으로 URL 형태로 반환
    const params = new URLSearchParams({
      clientKey: this.config.clientKey,
      amount: createPaymentDto.amount.toString(),
      orderId: createPaymentDto.orderId,
      orderName: createPaymentDto.orderName,
      customerName: createPaymentDto.customerName,
      customerEmail: createPaymentDto.customerEmail,
      successUrl: createPaymentDto.successUrl,
      failUrl: createPaymentDto.failUrl,
    });

    return `${baseCheckoutUrl}?${params.toString()}`;
  }

  /**
   * API 에러 처리
   */
  private handleApiError(error: any): Error {
    if (error.response?.data) {
      const errorData = error.response.data;
      return new BadRequestException({
        code: errorData.code,
        message: errorData.message || '결제 처리 중 오류가 발생했습니다.',
        details: errorData,
      });
    }

    return new InternalServerErrorException('결제 서비스 연동 중 오류가 발생했습니다.');
  }

  /**
   * 결제 관련 에러 처리
   */
  private handlePaymentError(error: any, defaultMessage: string): Error {
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      return new BadRequestException(errorData.message || defaultMessage);
    }

    if (error.response?.status === 404) {
      return new BadRequestException('결제 정보를 찾을 수 없습니다.');
    }

    if (error.response?.status === 409) {
      return new BadRequestException('이미 처리된 결제입니다.');
    }

    this.logger.error('Payment service error:', error);
    return new InternalServerErrorException(defaultMessage);
  }

  /**
   * 결제 키 유효성 검증
   */
  private isValidPaymentKey(paymentKey: string): boolean {
    // 토스페이먼츠 결제 키 형식 검증
    const paymentKeyRegex = /^[a-zA-Z0-9_-]+$/;
    return paymentKeyRegex.test(paymentKey) && paymentKey.length > 10;
  }

  /**
   * 주문 ID 유효성 검증
   */
  private isValidOrderId(orderId: string): boolean {
    // 주문 ID 형식 검증 (영문, 숫자, 특수문자 일부만 허용)
    const orderIdRegex = /^[a-zA-Z0-9_-]+$/;
    return orderIdRegex.test(orderId) && orderId.length >= 6 && orderId.length <= 64;
  }

  /**
   * 토스페이먼츠 설정 검증
   */
  private validateConfig(): void {
    if (!this.config.clientKey || !this.config.secretKey) {
      throw new Error('토스페이먼츠 API 키가 설정되지 않았습니다.');
    }

    if (!this.config.baseUrl) {
      throw new Error('토스페이먼츠 API URL이 설정되지 않았습니다.');
    }
  }

  /**
   * 결제 상태 매핑
   */
  private mapPaymentStatus(tossStatus: string): TossPaymentStatus {
    const statusMap: Record<string, TossPaymentStatus> = {
      'READY': TossPaymentStatus.READY,
      'IN_PROGRESS': TossPaymentStatus.IN_PROGRESS,
      'WAITING_FOR_DEPOSIT': TossPaymentStatus.WAITING_FOR_DEPOSIT,
      'DONE': TossPaymentStatus.DONE,
      'CANCELED': TossPaymentStatus.CANCELED,
      'PARTIAL_CANCELED': TossPaymentStatus.PARTIAL_CANCELED,
      'ABORTED': TossPaymentStatus.ABORTED,
      'EXPIRED': TossPaymentStatus.EXPIRED,
    };

    return statusMap[tossStatus] || TossPaymentStatus.READY;
  }

  /**
   * 환경 설정 확인
   */
  getConfig(): TossPaymentsConfig {
    return { ...this.config };
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{ status: string; config: any }> {
    try {
      this.validateConfig();
      return {
        status: 'healthy',
        config: {
          baseUrl: this.config.baseUrl,
          isTestMode: this.config.isTestMode,
          hasClientKey: !!this.config.clientKey,
          hasSecretKey: !!this.config.secretKey,
          hasWebhookSecret: !!this.config.webhookEndpointSecret,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        config: {
          error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        },
      };
    }
  }
} 