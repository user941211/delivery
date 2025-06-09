/**
 * 결제 모듈
 * 
 * 결제 관련 서비스, 컨트롤러, 프로바이더를 통합하는 NestJS 모듈입니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayController } from './controllers/payment-gateway.controller';
import { CouponController } from './controllers/coupon.controller';
import { PointsController } from './controllers/points.controller';
import { RefundController } from './controllers/refund.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { SecurityLoggingController } from './controllers/security-logging.controller';
import { PaymentService } from './services/payment.service';
import { TossPaymentsService } from './services/toss-payments.service';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { CouponService } from './services/coupon.service';
import { PointsService } from './services/points.service';
import { RefundService } from './services/refund.service';
import { SubscriptionService } from './services/subscription.service';
import { SecurityLoggingService } from './services/security-logging.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule,
    OrdersModule, // 주문 서비스와의 연동을 위해 OrdersModule 가져오기
  ],
  controllers: [
    PaymentsController,
    PaymentGatewayController,
    CouponController,
    PointsController,
    RefundController,
    SubscriptionController,
    SecurityLoggingController,
  ],
  providers: [
    PaymentService,
    TossPaymentsService,
    PaymentGatewayService,
    CouponService,
    PointsService,
    RefundService,
    SubscriptionService,
    SecurityLoggingService,
  ],
  exports: [
    PaymentService,
    TossPaymentsService,
    PaymentGatewayService,
    CouponService,
    PointsService,
    RefundService,
    SubscriptionService,
    SecurityLoggingService,
  ],
})
export class PaymentsModule {} 