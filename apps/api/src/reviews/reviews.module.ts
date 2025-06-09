import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

/**
 * 리뷰 모듈
 * 리뷰 및 평점 시스템의 모든 컴포넌트를 관리하는 모듈
 */
@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService], // 다른 모듈에서 사용할 수 있도록 export
})
export class ReviewsModule {} 