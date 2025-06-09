/**
 * 실시간 통신 모듈
 * 
 * WebSocket 기반 실시간 기능들을 관리하는 모듈입니다.
 */

import { Module, forwardRef } from '@nestjs/common';
import { OrderTrackingGateway } from './gateways/order-tracking.gateway';
import { RealtimeNotificationService } from './services/realtime-notification.service';

@Module({
  providers: [
    OrderTrackingGateway,
    RealtimeNotificationService,
  ],
  exports: [
    OrderTrackingGateway,
    RealtimeNotificationService,
  ],
})
export class RealtimeModule {} 