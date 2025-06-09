/**
 * 장바구니 모듈
 * 
 * 장바구니 관련 서비스와 컨트롤러를 제공합니다.
 */

import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './services/cart.service';
import { CartSessionService } from './services/cart-session.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartSessionService],
  exports: [CartService, CartSessionService],
})
export class CartModule {} 