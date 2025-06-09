import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { OrdersModule } from './orders/orders.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { DriversModule } from './drivers/drivers.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DeliveryModule } from './delivery/delivery.module';
import { TrackingModule } from './tracking/tracking.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AdminModule } from './admin/admin.module';

/**
 * 배달 플랫폼 API 서버의 루트 모듈
 * 
 * 주요 기능:
 * - 환경 변수 설정 관리
 * - 요청 제한 (Rate Limiting)
 * - 모듈별 라우팅 관리
 * - 실시간 통신 (WebSocket)
 * - 시스템 모니터링 및 로깅
 * - 관리자 대시보드
 */
@Module({
  imports: [
    // 환경 변수 설정
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '../../.env.local',
        '../../.env',
        '.env.local',
        '.env'
      ],
    }),
    
    // 요청 제한 설정 (DDoS 방지)
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000, // 1분
        limit: 100, // 분당 100 요청
      },
    ]),
    
    // 기능별 모듈
    HealthModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    SearchModule,
    OrdersModule,
    CartModule,
    PaymentsModule,
    DriversModule,
    RealtimeModule, // 실시간 통신 모듈
    DeliveryModule,
    TrackingModule,
    ChatModule,
    ReviewsModule, // 리뷰 및 평점 시스템
    MonitoringModule, // 시스템 모니터링 및 로깅
    AdminModule, // 관리자 대시보드
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} 