import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * 관리자 모듈
 * 플랫폼 관리를 위한 관리자 기능의 모든 컴포넌트를 관리하는 모듈
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService], // 다른 모듈에서 사용할 수 있도록 export
})
export class AdminModule {} 