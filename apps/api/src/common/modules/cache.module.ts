/**
 * 캐싱 모듈
 * 
 * CacheService를 애플리케이션에 통합하고
 * 다른 모듈에서 사용할 수 있도록 내보냅니다.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../services/cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {} 