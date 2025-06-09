/**
 * 배달기사 모듈
 * 
 * 배달기사 신청 및 관리 기능을 제공하는 모듈입니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriverApplicationService } from './driver-application.service';
import { DriverApplicationController } from './controllers/driver-application.controller';
import { AdminDriverApplicationController } from './controllers/admin-driver-application.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    AuthModule
  ],
  controllers: [
    DriverApplicationController,
    AdminDriverApplicationController
  ],
  providers: [
    DriverApplicationService
  ],
  exports: [
    DriverApplicationService
  ],
})
export class DriversModule {} 