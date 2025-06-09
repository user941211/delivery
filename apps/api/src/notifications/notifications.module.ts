/**
 * 실시간 알림 모듈
 * 
 * 점주용 실시간 알림 서비스와 WebSocket 게이트웨이를 관리합니다.
 */

import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { NotificationGateway } from './gateways/notification.gateway';

@Module({
  providers: [
    NotificationService,
    NotificationGateway
  ],
  exports: [
    NotificationService,
    NotificationGateway
  ]
})
export class NotificationsModule {} 