/**
 * 간편결제 연동 서비스
 * 
 * 카카오페이, 토스페이, 네이버페이 등 주요 PG사와의 API 연동을 담당합니다.
 */

import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  PaymentGateway,
  PaymentGatewayStatus,
  PaymentMethod,
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
  CardInfo,
  BankInfo,
  PaymentHistoryItem
} from '../dto/payment-gateway.dto';

/**
 * PG사별 설정 인터페이스
 */
interface PaymentGatewayConfig {
  kakaopay: {
    cid: string;
    adminKey: string;
    baseUrl: string;
  };
  toss: {
    clientKey: string;
    secretKey: string;
    baseUrl: string;
  };
  naverpay: {
    merchantId: string;
    merchantKey: string;
    baseUrl: string;
  };
}

/**
 * 간편결제 연동 서비스 클래스
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly supabase: SupabaseClient;
  private readonly pgConfig: PaymentGatewayConfig;
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly configService: ConfigService
  ) {
    // HTTP 클라이언트 초기화
    this.httpClient = axios.create({
      timeout: 30000, // 30초 타임아웃
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeliveryPlatform/1.0'
      }
    });

    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );

    // PG사 설정 초기화
    this.pgConfig = {
      kakaopay: {
        cid: this.configService.get<string>('KAKAOPAY_CID') || '',
        adminKey: this.configService.get<string>('KAKAOPAY_ADMIN_KEY') || '',
        baseUrl: 'https://kapi.kakao.com'
      },
      toss: {
        clientKey: this.configService.get<string>('TOSS_CLIENT_KEY') || '',
        secretKey: this.configService.get<string>('TOSS_SECRET_KEY') || '',
        baseUrl: 'https://api.tosspayments.com'
      },
      naverpay: {
        merchantId: this.configService.get<string>('NAVERPAY_MERCHANT_ID') || '',
        merchantKey: this.configService.get<string>('NAVERPAY_MERCHANT_KEY') || '',
        baseUrl: 'https://dev.apis.naver.com'
      }
    };
  }

  /**
   * 결제 요청 처리
   */
  async initiatePayment(paymentRequest: PaymentGatewayRequestDto): Promise<PaymentGatewayResponseDto> {
    try {
      this.logger.log(`Initiating payment with ${paymentRequest.gateway} for order: ${paymentRequest.orderId}`);

      // 결제 요청 데이터 검증
      this.validatePaymentRequest(paymentRequest);

      // PG사별 결제 처리
      let response: PaymentGatewayResponseDto;

      switch (paymentRequest.gateway) {
        case PaymentGateway.KAKAOPAY:
          response = await this.processKakaoPayment(paymentRequest as KakaoPayRequestDto);
          break;
        case PaymentGateway.TOSS:
          response = await this.processTossPayment(paymentRequest as TossPaymentRequestDto);
          break;
        case PaymentGateway.NAVERPAY:
          response = await this.processNaverPayment(paymentRequest as NaverPayRequestDto);
          break;
        default:
          throw new BadRequestException(`지원하지 않는 PG사입니다: ${paymentRequest.gateway}`);
      }

      // 결제 정보를 데이터베이스에 저장
      await this.savePaymentRecord(response);

      this.logger.log(`Payment initiated successfully: ${response.paymentId}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to initiate payment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 카카오페이 결제 처리
   */
  private async processKakaoPayment(request: KakaoPayRequestDto): Promise<PaymentGatewayResponseDto> {
    try {
      const paymentData = new URLSearchParams({
        cid: request.cid || this.pgConfig.kakaopay.cid,
        partner_order_id: request.orderId,
        partner_user_id: request.buyerId,
        item_name: request.itemName,
        quantity: '1',
        total_amount: request.amount.toString(),
        vat_amount: Math.floor(request.amount / 11).toString(), // 부가세 계산
        tax_free_amount: '0',
        approval_url: request.successUrl || `${this.configService.get('APP_URL')}/payment/success`,
        fail_url: request.failUrl || `${this.configService.get('APP_URL')}/payment/fail`,
        cancel_url: request.cancelUrl || `${this.configService.get('APP_URL')}/payment/cancel`,
        install_month: (request.installMonth || 0).toString()
      });

      const response: AxiosResponse = await this.httpClient.post(
        `${this.pgConfig.kakaopay.baseUrl}/v1/payment/ready`,
        paymentData.toString(),
        {
          headers: {
            'Authorization': `KakaoAK ${this.pgConfig.kakaopay.adminKey}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
          }
        }
      );

      const kakaoResponse = response.data;

      return {
        paymentId: kakaoResponse.tid,
        orderId: request.orderId,
        status: PaymentGatewayStatus.READY,
        amount: request.amount,
        gateway: PaymentGateway.KAKAOPAY,
        method: request.method,
        paymentUrl: request.mobileWeb ? kakaoResponse.next_redirect_mobile_url : kakaoResponse.next_redirect_pc_url,
        requestedAt: new Date(),
        metadata: {
          kakaoTid: kakaoResponse.tid,
          redirectUrls: {
            pc: kakaoResponse.next_redirect_pc_url,
            mobile: kakaoResponse.next_redirect_mobile_url,
            app: kakaoResponse.next_redirect_app_url
          }
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`KakaoPay payment failed: ${errorMessage}`);
      throw new InternalServerErrorException('카카오페이 결제 요청에 실패했습니다.');
    }
  }

  /**
   * 토스 결제 처리
   */
  private async processTossPayment(request: TossPaymentRequestDto): Promise<PaymentGatewayResponseDto> {
    try {
      const paymentData = {
        method: request.method.toUpperCase(),
        amount: request.amount,
        orderId: request.orderId,
        orderName: request.itemName,
        customerName: request.buyerName,
        customerEmail: request.buyerEmail,
        customerMobilePhone: request.buyerPhone,
        successUrl: request.successUrl || `${this.configService.get('APP_URL')}/payment/success`,
        failUrl: request.failUrl || `${this.configService.get('APP_URL')}/payment/fail`,
        ...(request.cardCompany && { cardCompany: request.cardCompany }),
        ...(request.installmentMonths && { installmentMonths: request.installmentMonths }),
        ...(request.cardDiscount && { cardDiscount: request.cardDiscount })
      };

      const response: AxiosResponse = await this.httpClient.post(
        `${this.pgConfig.toss.baseUrl}/v1/payments`,
        paymentData,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(this.pgConfig.toss.secretKey + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const tossResponse = response.data;

      return {
        paymentId: tossResponse.paymentKey,
        orderId: request.orderId,
        status: PaymentGatewayStatus.READY,
        amount: request.amount,
        gateway: PaymentGateway.TOSS,
        method: request.method,
        paymentUrl: tossResponse.checkout.url,
        requestedAt: new Date(),
        metadata: {
          paymentKey: tossResponse.paymentKey,
          checkoutUrl: tossResponse.checkout.url
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Toss payment failed: ${errorMessage}`);
      throw new InternalServerErrorException('토스 결제 요청에 실패했습니다.');
    }
  }

  /**
   * 네이버페이 결제 처리
   */
  private async processNaverPayment(request: NaverPayRequestDto): Promise<PaymentGatewayResponseDto> {
    try {
      const paymentData = {
        merchantId: request.merchantId || this.pgConfig.naverpay.merchantId,
        merchantUserKey: request.buyerId,
        merchantPayKey: request.orderId,
        productName: request.itemName,
        productCount: 1,
        totalPayAmount: request.amount,
        shippingAmount: request.shippingFee || 0,
        taxScopeAmount: request.amount,
        taxExScopeAmount: 0,
        returnUrl: request.successUrl || `${this.configService.get('APP_URL')}/payment/success`,
        ...(request.productCategory && { productCategory: request.productCategory }),
        ...(request.useNaverPoint && { useNaverPoint: request.useNaverPoint })
      };

      const response: AxiosResponse = await this.httpClient.post(
        `${this.pgConfig.naverpay.baseUrl}/naverpay-partner/naverpay/payments/v2.2/apply`,
        paymentData,
        {
          headers: {
            'X-Naver-Client-Id': this.pgConfig.naverpay.merchantId,
            'X-Naver-Client-Secret': this.pgConfig.naverpay.merchantKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const naverResponse = response.data;

      return {
        paymentId: naverResponse.paymentId,
        orderId: request.orderId,
        status: PaymentGatewayStatus.READY,
        amount: request.amount,
        gateway: PaymentGateway.NAVERPAY,
        method: request.method,
        paymentUrl: naverResponse.paymentUrl,
        requestedAt: new Date(),
        metadata: {
          naverPaymentId: naverResponse.paymentId,
          paymentUrl: naverResponse.paymentUrl
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`NaverPay payment failed: ${errorMessage}`);
      throw new InternalServerErrorException('네이버페이 결제 요청에 실패했습니다.');
    }
  }

  /**
   * 결제 승인 처리
   */
  async approvePayment(paymentId: string, approvalData: any): Promise<PaymentGatewayResponseDto> {
    try {
      this.logger.log(`Approving payment: ${paymentId}`);

      // 기존 결제 정보 조회
      const { data: payment } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }

      let approvalResult: PaymentGatewayResponseDto;

      switch (payment.gateway) {
        case PaymentGateway.KAKAOPAY:
          approvalResult = await this.approveKakaoPayment(payment, approvalData);
          break;
        case PaymentGateway.TOSS:
          approvalResult = await this.approveTossPayment(payment, approvalData);
          break;
        case PaymentGateway.NAVERPAY:
          approvalResult = await this.approveNaverPayment(payment, approvalData);
          break;
        default:
          throw new BadRequestException(`지원하지 않는 PG사입니다: ${payment.gateway}`);
      }

      // 결제 승인 정보 업데이트
      await this.updatePaymentRecord(approvalResult);

      this.logger.log(`Payment approved successfully: ${paymentId}`);
      return approvalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to approve payment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 카카오페이 승인 처리
   */
  private async approveKakaoPayment(payment: any, approvalData: any): Promise<PaymentGatewayResponseDto> {
    const approveData = new URLSearchParams({
      cid: payment.metadata.cid || this.pgConfig.kakaopay.cid,
      tid: payment.payment_id,
      partner_order_id: payment.order_id,
      partner_user_id: payment.buyer_id,
      pg_token: approvalData.pg_token
    });

    const response: AxiosResponse = await this.httpClient.post(
      `${this.pgConfig.kakaopay.baseUrl}/v1/payment/approve`,
      approveData.toString(),
      {
        headers: {
          'Authorization': `KakaoAK ${this.pgConfig.kakaopay.adminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      }
    );

    const kakaoResponse = response.data;

    return {
      paymentId: kakaoResponse.tid,
      orderId: payment.order_id,
      status: PaymentGatewayStatus.APPROVED,
      amount: kakaoResponse.amount.total,
      gateway: PaymentGateway.KAKAOPAY,
      method: payment.method,
      approvalNumber: kakaoResponse.aid,
      cardInfo: kakaoResponse.card_info ? this.mapKakaoCardInfo(kakaoResponse.card_info) : undefined,
      requestedAt: new Date(payment.created_at),
      approvedAt: new Date(),
      metadata: {
        ...payment.metadata,
        approvalInfo: kakaoResponse
      }
    };
  }

  /**
   * 토스 승인 처리
   */
  private async approveTossPayment(payment: any, approvalData: any): Promise<PaymentGatewayResponseDto> {
    const confirmData = {
      paymentKey: payment.payment_id,
      orderId: payment.order_id,
      amount: payment.amount
    };

    const response: AxiosResponse = await this.httpClient.post(
      `${this.pgConfig.toss.baseUrl}/v1/payments/confirm`,
      confirmData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.pgConfig.toss.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const tossResponse = response.data;

    return {
      paymentId: tossResponse.paymentKey,
      orderId: payment.order_id,
      status: PaymentGatewayStatus.APPROVED,
      amount: tossResponse.totalAmount,
      gateway: PaymentGateway.TOSS,
      method: payment.method,
      approvalNumber: tossResponse.approvedAt,
      cardInfo: tossResponse.card ? this.mapTossCardInfo(tossResponse.card) : undefined,
      requestedAt: new Date(payment.created_at),
      approvedAt: new Date(),
      metadata: {
        ...payment.metadata,
        approvalInfo: tossResponse
      }
    };
  }

  /**
   * 네이버페이 승인 처리
   */
  private async approveNaverPayment(payment: any, approvalData: any): Promise<PaymentGatewayResponseDto> {
    const response: AxiosResponse = await this.httpClient.get(
      `${this.pgConfig.naverpay.baseUrl}/naverpay-partner/naverpay/payments/v2.2/apply/${payment.payment_id}`,
      {
        headers: {
          'X-Naver-Client-Id': this.pgConfig.naverpay.merchantId,
          'X-Naver-Client-Secret': this.pgConfig.naverpay.merchantKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const naverResponse = response.data;

    return {
      paymentId: payment.payment_id,
      orderId: payment.order_id,
      status: PaymentGatewayStatus.APPROVED,
      amount: naverResponse.body.totalPayAmount,
      gateway: PaymentGateway.NAVERPAY,
      method: payment.method,
      approvalNumber: naverResponse.body.paymentId,
      requestedAt: new Date(payment.created_at),
      approvedAt: new Date(),
      metadata: {
        ...payment.metadata,
        approvalInfo: naverResponse.body
      }
    };
  }

  /**
   * 결제 취소/환불 처리
   */
  async cancelPayment(cancelRequest: PaymentCancelRequestDto): Promise<PaymentGatewayResponseDto> {
    try {
      this.logger.log(`Cancelling payment: ${cancelRequest.paymentId}`);

      // 기존 결제 정보 조회
      const { data: payment } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', cancelRequest.paymentId)
        .single();

      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }

      let cancelResult: PaymentGatewayResponseDto;

      switch (payment.gateway) {
        case PaymentGateway.KAKAOPAY:
          cancelResult = await this.cancelKakaoPayment(payment, cancelRequest);
          break;
        case PaymentGateway.TOSS:
          cancelResult = await this.cancelTossPayment(payment, cancelRequest);
          break;
        case PaymentGateway.NAVERPAY:
          cancelResult = await this.cancelNaverPayment(payment, cancelRequest);
          break;
        default:
          throw new BadRequestException(`지원하지 않는 PG사입니다: ${payment.gateway}`);
      }

      // 취소 정보 업데이트
      await this.updatePaymentRecord(cancelResult);

      this.logger.log(`Payment cancelled successfully: ${cancelRequest.paymentId}`);
      return cancelResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to cancel payment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 카카오페이 취소 처리
   */
  private async cancelKakaoPayment(payment: any, cancelRequest: PaymentCancelRequestDto): Promise<PaymentGatewayResponseDto> {
    const cancelData = new URLSearchParams({
      cid: payment.metadata.cid || this.pgConfig.kakaopay.cid,
      tid: payment.payment_id,
      cancel_amount: (cancelRequest.cancelAmount || payment.amount).toString(),
      cancel_tax_free_amount: '0'
    });

    const response: AxiosResponse = await this.httpClient.post(
      `${this.pgConfig.kakaopay.baseUrl}/v1/payment/cancel`,
      cancelData.toString(),
      {
        headers: {
          'Authorization': `KakaoAK ${this.pgConfig.kakaopay.adminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      }
    );

    const kakaoResponse = response.data;

    return {
      paymentId: payment.payment_id,
      orderId: payment.order_id,
      status: cancelRequest.cancelAmount ? PaymentGatewayStatus.PARTIAL_CANCELLED : PaymentGatewayStatus.CANCELLED,
      amount: payment.amount,
      gateway: PaymentGateway.KAKAOPAY,
      method: payment.method,
      requestedAt: new Date(payment.created_at),
      metadata: {
        ...payment.metadata,
        cancelInfo: kakaoResponse,
        cancelReason: cancelRequest.cancelReason
      }
    };
  }

  /**
   * 토스 취소 처리
   */
  private async cancelTossPayment(payment: any, cancelRequest: PaymentCancelRequestDto): Promise<PaymentGatewayResponseDto> {
    const cancelData = {
      cancelReason: cancelRequest.cancelReason,
      ...(cancelRequest.cancelAmount && { cancelAmount: cancelRequest.cancelAmount }),
      ...(cancelRequest.refundAccount && { 
        refundReceiveAccount: {
          bank: cancelRequest.refundAccount.bankCode,
          accountNumber: cancelRequest.refundAccount.accountNumber,
          holderName: cancelRequest.refundAccount.holderName
        }
      })
    };

    const response: AxiosResponse = await this.httpClient.post(
      `${this.pgConfig.toss.baseUrl}/v1/payments/${payment.payment_id}/cancel`,
      cancelData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.pgConfig.toss.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const tossResponse = response.data;

    return {
      paymentId: payment.payment_id,
      orderId: payment.order_id,
      status: tossResponse.status === 'PARTIAL_CANCELLED' ? PaymentGatewayStatus.PARTIAL_CANCELLED : PaymentGatewayStatus.CANCELLED,
      amount: payment.amount,
      gateway: PaymentGateway.TOSS,
      method: payment.method,
      requestedAt: new Date(payment.created_at),
      metadata: {
        ...payment.metadata,
        cancelInfo: tossResponse,
        cancelReason: cancelRequest.cancelReason
      }
    };
  }

  /**
   * 네이버페이 취소 처리
   */
  private async cancelNaverPayment(payment: any, cancelRequest: PaymentCancelRequestDto): Promise<PaymentGatewayResponseDto> {
    const cancelData = {
      paymentId: payment.payment_id,
      cancelAmount: cancelRequest.cancelAmount || payment.amount,
      cancelReason: cancelRequest.cancelReason
    };

    const response: AxiosResponse = await this.httpClient.post(
      `${this.pgConfig.naverpay.baseUrl}/naverpay-partner/naverpay/payments/v2.2/cancel`,
      cancelData,
      {
        headers: {
          'X-Naver-Client-Id': this.pgConfig.naverpay.merchantId,
          'X-Naver-Client-Secret': this.pgConfig.naverpay.merchantKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const naverResponse = response.data;

    return {
      paymentId: payment.payment_id,
      orderId: payment.order_id,
      status: PaymentGatewayStatus.CANCELLED,
      amount: payment.amount,
      gateway: PaymentGateway.NAVERPAY,
      method: payment.method,
      requestedAt: new Date(payment.created_at),
      metadata: {
        ...payment.metadata,
        cancelInfo: naverResponse,
        cancelReason: cancelRequest.cancelReason
      }
    };
  }

  /**
   * 결제 상태 조회
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponseDto> {
    try {
      const { data: payment } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }

      // 결제 이력 조회
      const { data: history } = await this.supabase
        .from('payment_history')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true });

      return {
        paymentId: payment.payment_id,
        orderId: payment.order_id,
        status: payment.status,
        totalAmount: payment.amount,
        cancelledAmount: payment.cancelled_amount || 0,
        remainingAmount: payment.amount - (payment.cancelled_amount || 0),
        history: (history || []).map(item => ({
          action: item.action,
          amount: item.amount,
          status: item.status,
          timestamp: new Date(item.created_at),
          reason: item.reason,
          metadata: item.metadata
        })),
        lastUpdated: new Date(payment.updated_at)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get payment status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 웹훅 처리
   */
  async handleWebhook(webhookData: PaymentWebhookDto): Promise<void> {
    try {
      this.logger.log(`Processing webhook for payment: ${webhookData.paymentId}`);

      // 웹훅 서명 검증 (보안)
      if (webhookData.signature) {
        this.verifyWebhookSignature(webhookData);
      }

      // 결제 상태 업데이트
      await this.updatePaymentFromWebhook(webhookData);

      // 주문 상태 업데이트 알림 (다른 서비스에 통지)
      await this.notifyPaymentStatusChange(webhookData);

      this.logger.log(`Webhook processed successfully for payment: ${webhookData.paymentId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process webhook: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 내부 메서드들
   */

  /**
   * 결제 요청 검증
   */
  private validatePaymentRequest(request: PaymentGatewayRequestDto): void {
    if (request.amount < 100) {
      throw new BadRequestException('최소 결제 금액은 100원입니다.');
    }

    if (!request.orderId || !request.buyerId) {
      throw new BadRequestException('주문 ID와 구매자 ID는 필수입니다.');
    }
  }

  /**
   * 결제 정보 저장
   */
  private async savePaymentRecord(payment: PaymentGatewayResponseDto): Promise<void> {
    const { error } = await this.supabase
      .from('payment_transactions')
      .insert({
        payment_id: payment.paymentId,
        order_id: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        gateway: payment.gateway,
        method: payment.method,
        buyer_id: payment.metadata?.buyerId,
        approval_number: payment.approvalNumber,
        metadata: payment.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      this.logger.error('Failed to save payment record:', error);
    }
  }

  /**
   * 결제 정보 업데이트
   */
  private async updatePaymentRecord(payment: PaymentGatewayResponseDto): Promise<void> {
    const { error } = await this.supabase
      .from('payment_transactions')
      .update({
        status: payment.status,
        approval_number: payment.approvalNumber,
        approved_at: payment.approvedAt?.toISOString(),
        metadata: payment.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', payment.paymentId);

    if (error) {
      this.logger.error('Failed to update payment record:', error);
    }

    // 결제 이력 저장
    await this.savePaymentHistory(payment);
  }

  /**
   * 결제 이력 저장
   */
  private async savePaymentHistory(payment: PaymentGatewayResponseDto): Promise<void> {
    const action = payment.status === PaymentGatewayStatus.APPROVED ? 'payment' : 
                  payment.status === PaymentGatewayStatus.CANCELLED ? 'cancel' : 'update';

    const { error } = await this.supabase
      .from('payment_history')
      .insert({
        payment_id: payment.paymentId,
        action,
        amount: payment.amount,
        status: payment.status,
        reason: payment.metadata?.cancelReason,
        metadata: payment.metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      this.logger.error('Failed to save payment history:', error);
    }
  }

  /**
   * 웹훅에서 결제 상태 업데이트
   */
  private async updatePaymentFromWebhook(webhookData: PaymentWebhookDto): Promise<void> {
    const { error } = await this.supabase
      .from('payment_transactions')
      .update({
        status: webhookData.status,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', webhookData.paymentId);

    if (error) {
      this.logger.error('Failed to update payment from webhook:', error);
    }
  }

  /**
   * 웹훅 서명 검증
   */
  private verifyWebhookSignature(webhookData: PaymentWebhookDto): boolean {
    // 실제 구현에서는 각 PG사별 서명 검증 로직 필요
    return true;
  }

  /**
   * 결제 상태 변경 알림
   */
  private async notifyPaymentStatusChange(webhookData: PaymentWebhookDto): Promise<void> {
    // 다른 서비스에 결제 상태 변경 알림
    // 예: 주문 서비스, 알림 서비스 등
    this.logger.log(`Payment status changed: ${webhookData.paymentId} -> ${webhookData.status}`);
  }

  /**
   * 카드 정보 매핑 (카카오페이)
   */
  private mapKakaoCardInfo(cardInfo: any): CardInfo {
    return {
      cardCompany: cardInfo.card_company,
      cardNumber: cardInfo.card_number,
      cardType: cardInfo.card_type,
      installmentMonths: cardInfo.installment_month,
      approvalNumber: cardInfo.approve_no,
      acquirerCode: cardInfo.acquirer_code
    };
  }

  /**
   * 카드 정보 매핑 (토스)
   */
  private mapTossCardInfo(cardInfo: any): CardInfo {
    return {
      cardCompany: cardInfo.company,
      cardNumber: cardInfo.number,
      cardType: cardInfo.cardType,
      installmentMonths: cardInfo.installmentPlanMonths,
      approvalNumber: cardInfo.approveNo,
      acquirerCode: cardInfo.acquirerCode
    };
  }
} 