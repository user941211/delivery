/**
 * 주문 모듈
 * 
 * 주문 관련 컨트롤러, 서비스, DTO를 관리합니다.
 */

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderService } from './services/order.service';
import { OwnerOrderController } from './controllers/owner/owner-order.controller';
import { OwnerOrderService } from './services/owner/owner-order.service';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CartModule,
    NotificationsModule
  ],
  controllers: [
    OrdersController,
    OwnerOrderController
  ],
  providers: [
    OrderService,
    OwnerOrderService
  ],
  exports: [
    OrderService,
    OwnerOrderService
  ],
})
export class OrdersModule {} 