import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * 헬스 체크 모듈
 * 
 * 서버 상태 모니터링을 위한 엔드포인트를 제공합니다.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {} 