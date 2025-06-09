/**
 * 검색 모듈
 * 
 * 고객용 레스토랑 검색 기능을 제공하는 모듈입니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { RestaurantSearchService } from './services/restaurant-search.service';

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [RestaurantSearchService],
  exports: [RestaurantSearchService],
})
export class SearchModule {} 