import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { LoggingService } from './logging.service';

/**
 * 모니터링 모듈
 * 시스템 모니터링, 로깅, 헬스 체크 등의 모든 컴포넌트를 관리하는 모듈
 */
@Module({
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    LoggingService,
    {
      provide: 'Logger',
      useClass: LoggingService, // NestJS 기본 로거를 커스텀 로깅 서비스로 대체
    },
  ],
  exports: [MonitoringService, LoggingService], // 다른 모듈에서 사용할 수 있도록 export
})
export class MonitoringModule {} 