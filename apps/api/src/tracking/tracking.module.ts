/**
 * GPS 추적 모듈
 * 
 * GPS 위치 추적과 관련된 모든 구성 요소를 통합하는 모듈입니다.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 서비스
import { GpsTrackingService } from './services';

// 외부 모듈
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * GPS 추적 모듈 클래스
 */
@Module({
  imports: [
    ConfigModule,
    // Realtime 모듈과의 상호 의존성 해결을 위해 forwardRef 사용
    forwardRef(() => RealtimeModule),
  ],
  providers: [
    // 서비스
    GpsTrackingService,
  ],
  exports: [
    // 다른 모듈에서 사용할 수 있도록 서비스들을 export
    GpsTrackingService,
  ],
})
export class TrackingModule {
  constructor() {
    // 모듈 초기화 로그
    console.log('📍 TrackingModule initialized - GPS tracking system ready');
  }
} 