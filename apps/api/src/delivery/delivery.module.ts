/**
 * 배달 모듈
 * 
 * 배달 관련 모든 기능을 관리하는 모듈입니다.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 서비스
import { 
  DriverLocationService,
  DeliveryMatchingService,
  DeliveryRequestService
} from './services';

// 컨트롤러
import { DeliveryAssignmentController } from './controllers';

// 실시간 모듈
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => RealtimeModule), // 순환 의존성 방지
  ],
  providers: [
    DriverLocationService,
    DeliveryMatchingService,
    DeliveryRequestService,
  ],
  controllers: [
    DeliveryAssignmentController,
  ],
  exports: [
    DriverLocationService,
    DeliveryMatchingService,
    DeliveryRequestService,
  ],
})
export class DeliveryModule {} 