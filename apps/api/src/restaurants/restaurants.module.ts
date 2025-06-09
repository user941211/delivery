/**
 * 레스토랑 관리 모듈
 * 
 * 레스토랑 등록, 관리, 메뉴 관리 기능을 제공하는 모듈입니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RestaurantsService } from './restaurants.service';
import { CategoryService } from './services/category.service';
import { BusinessHoursService } from './services/business-hours.service';
import { ImageService } from './services/image.service';
import { MenuItemService } from './services/menu-item.service';
import { OptionGroupService } from './services/option-group.service';
import { MenuOptionService } from './services/menu-option.service';
import { MenuImageService } from './services/menu-image.service';
import { RestaurantsController } from './restaurants.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    CategoryService,
    BusinessHoursService,
    ImageService,
    MenuItemService,
    OptionGroupService,
    MenuOptionService,
    MenuImageService,
  ],
  exports: [
    RestaurantsService,
    CategoryService,
    BusinessHoursService,
    ImageService,
    MenuItemService,
    OptionGroupService,
    MenuOptionService,
    MenuImageService,
  ],
})
export class RestaurantsModule {} 