/**
 * 장바구니 서비스
 * 
 * 장바구니 핵심 비즈니스 로직 및 가격 계산 엔진을 제공합니다.
 */

import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AddCartItemDto, 
  UpdateCartItemDto, 
  CartResponseDto, 
  CartItemResponseDto,
  CartItemStatus,
  SelectedMenuOptionDto,
  PriceCalculationDto,
  DeliveryInfoDto,
  DiscountInfoDto,
  RestaurantSummaryDto,
  CartValidationDto,
  QuickReorderDto
} from '../dto/cart.dto';

interface CartSession {
  id: string;
  restaurantId?: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface CartItem {
  id: string;
  menuItemId: string;
  quantity: number;
  selectedOptions: SelectedMenuOptionDto[];
  specialInstructions?: string;
  addedAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CartService {
  private readonly supabase: SupabaseClient;
  private readonly cartSessions = new Map<string, CartSession>(); // 세션 기반 임시 저장

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 장바구니 조회
   * 세션 ID 또는 사용자 ID로 장바구니를 조회합니다.
   */
  async getCart(sessionId: string, userId?: string): Promise<CartResponseDto | null> {
    try {
      let cartData: CartSession | null = null;

      // 로그인 사용자인 경우 데이터베이스에서 조회
      if (userId) {
        const { data: dbCart, error } = await this.supabase
          .from('user_carts')
          .select(`
            *,
            cart_items(
              *,
              menu_items(
                id,
                name,
                description,
                price,
                is_available,
                images:menu_images(url, is_primary)
              )
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw new InternalServerErrorException('장바구니 조회 중 오류가 발생했습니다.');
        }

        if (dbCart) {
          cartData = this.transformDbCartToSession(dbCart);
        }
      }

      // 세션 기반 장바구니 조회 (로그인하지 않은 사용자 또는 DB에 없는 경우)
      if (!cartData) {
        cartData = this.cartSessions.get(sessionId) || null;
      }

      if (!cartData || cartData.items.length === 0) {
        return null;
      }

      // 장바구니 데이터를 응답 형식으로 변환
      return await this.transformCartToResponse(cartData);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('장바구니 조회 중 예상치 못한 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니에 아이템 추가
   */
  async addItem(sessionId: string, addItemDto: AddCartItemDto, userId?: string): Promise<CartItemResponseDto> {
    try {
      // 메뉴 아이템 정보 조회 및 검증
      const menuItem = await this.validateMenuItem(addItemDto.menuItemId, addItemDto.restaurantId);
      
      // 선택된 옵션 검증
      await this.validateSelectedOptions(addItemDto.selectedOptions, addItemDto.menuItemId);

      // 기존 장바구니 조회 또는 새로 생성
      let cart = this.cartSessions.get(sessionId);
      
      if (!cart) {
        cart = this.createNewCart(sessionId, addItemDto.restaurantId);
        this.cartSessions.set(sessionId, cart);
      }

      // 다른 레스토랑의 아이템이 있는지 확인
      if (cart.restaurantId && cart.restaurantId !== addItemDto.restaurantId) {
        throw new BadRequestException('다른 레스토랑의 메뉴는 함께 주문할 수 없습니다. 기존 장바구니를 비우고 다시 시도해주세요.');
      }

      cart.restaurantId = addItemDto.restaurantId;

      // 동일한 아이템이 이미 있는지 확인 (메뉴 ID + 옵션 조합)
      const existingItemIndex = this.findExistingItem(cart.items, addItemDto);
      
      if (existingItemIndex !== -1) {
        // 기존 아이템 수량 증가
        cart.items[existingItemIndex].quantity += addItemDto.quantity;
        cart.items[existingItemIndex].updatedAt = new Date();
        
        if (addItemDto.specialInstructions) {
          cart.items[existingItemIndex].specialInstructions = addItemDto.specialInstructions;
        }
      } else {
        // 새 아이템 추가
        const newItem: CartItem = {
          id: this.generateCartItemId(),
          menuItemId: addItemDto.menuItemId,
          quantity: addItemDto.quantity,
          selectedOptions: addItemDto.selectedOptions || [],
          specialInstructions: addItemDto.specialInstructions,
          addedAt: new Date(),
          updatedAt: new Date()
        };
        
        cart.items.push(newItem);
      }

      cart.updatedAt = new Date();

      // 로그인 사용자인 경우 데이터베이스에도 저장
      if (userId) {
        await this.syncCartToDatabase(cart, userId);
      }

      // 추가된/수정된 아이템 정보 반환
      const targetItem = existingItemIndex !== -1 ? cart.items[existingItemIndex] : cart.items[cart.items.length - 1];
      return await this.transformCartItemToResponse(targetItem, menuItem);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('장바구니 아이템 추가 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 아이템 수정
   */
  async updateItem(sessionId: string, itemId: string, updateDto: UpdateCartItemDto, userId?: string): Promise<CartItemResponseDto> {
    try {
      const cart = this.cartSessions.get(sessionId);
      if (!cart) {
        throw new NotFoundException('장바구니가 존재하지 않습니다.');
      }

      const itemIndex = cart.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new NotFoundException('해당 아이템이 장바구니에 존재하지 않습니다.');
      }

      const item = cart.items[itemIndex];

      // 수량 업데이트
      if (updateDto.quantity !== undefined) {
        item.quantity = updateDto.quantity;
      }

      // 옵션 업데이트
      if (updateDto.selectedOptions !== undefined) {
        await this.validateSelectedOptions(updateDto.selectedOptions, item.menuItemId);
        item.selectedOptions = updateDto.selectedOptions;
      }

      // 특별 요청사항 업데이트
      if (updateDto.specialInstructions !== undefined) {
        item.specialInstructions = updateDto.specialInstructions;
      }

      item.updatedAt = new Date();
      cart.updatedAt = new Date();

      // 로그인 사용자인 경우 데이터베이스 동기화
      if (userId) {
        await this.syncCartToDatabase(cart, userId);
      }

      // 메뉴 아이템 정보 조회
      const menuItem = await this.getMenuItemInfo(item.menuItemId);
      return await this.transformCartItemToResponse(item, menuItem);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('장바구니 아이템 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 아이템 삭제
   */
  async removeItem(sessionId: string, itemId: string, userId?: string): Promise<void> {
    try {
      const cart = this.cartSessions.get(sessionId);
      if (!cart) {
        throw new NotFoundException('장바구니가 존재하지 않습니다.');
      }

      const itemIndex = cart.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new NotFoundException('해당 아이템이 장바구니에 존재하지 않습니다.');
      }

      cart.items.splice(itemIndex, 1);
      cart.updatedAt = new Date();

      // 로그인 사용자인 경우 데이터베이스 동기화
      if (userId) {
        await this.syncCartToDatabase(cart, userId);
      }

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('장바구니 아이템 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 전체 비우기
   */
  async clearCart(sessionId: string, userId?: string): Promise<void> {
    try {
      const cart = this.cartSessions.get(sessionId);
      if (cart) {
        cart.items = [];
        cart.restaurantId = undefined;
        cart.updatedAt = new Date();
      }

      // 세션에서 삭제
      this.cartSessions.delete(sessionId);

      // 로그인 사용자인 경우 데이터베이스에서도 삭제
      if (userId) {
        await this.supabase
          .from('user_carts')
          .update({ is_active: false })
          .eq('user_id', userId);
      }

    } catch (error) {
      throw new InternalServerErrorException('장바구니 비우기 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 검증
   * 메뉴 가격 변경, 품절 등을 확인합니다.
   */
  async validateCart(sessionId: string, userId?: string): Promise<CartValidationDto> {
    try {
      const cart = this.cartSessions.get(sessionId);
      if (!cart || cart.items.length === 0) {
        return {
          isValid: true,
          canProceedToOrder: false,
          messages: ['장바구니가 비어있습니다.'],
          warnings: [],
          changedItems: [],
          unavailableItems: [],
          validatedAt: new Date()
        };
      }

      const validationResult: CartValidationDto = {
        isValid: true,
        canProceedToOrder: true,
        messages: [],
        warnings: [],
        changedItems: [],
        unavailableItems: [],
        validatedAt: new Date()
      };

      // 각 아이템 검증
      for (const item of cart.items) {
        const menuItem = await this.getMenuItemInfo(item.menuItemId);
        
        if (!menuItem.is_available) {
          validationResult.unavailableItems.push(menuItem.name);
          validationResult.canProceedToOrder = false;
        }

        // 옵션 재고 검증
        for (const option of item.selectedOptions) {
          if (option.stockQuantity !== undefined && option.stockQuantity < item.quantity) {
            validationResult.warnings.push(`${menuItem.name}의 ${option.name} 옵션 재고가 부족합니다.`);
          }
        }
      }

      // 레스토랑 영업 상태 확인
      const restaurant = await this.getRestaurantInfo(cart.restaurantId!);
      if (!restaurant.is_open) {
        validationResult.canProceedToOrder = false;
        validationResult.messages.push('레스토랑이 현재 영업하지 않습니다.');
      }

      if (validationResult.unavailableItems.length > 0) {
        validationResult.isValid = false;
        validationResult.messages.push('일부 메뉴가 품절되었습니다.');
      }

      return validationResult;

    } catch (error) {
      throw new InternalServerErrorException('장바구니 검증 중 오류가 발생했습니다.');
    }
  }

  /**
   * 빠른 재주문
   * 이전 주문을 기반으로 장바구니를 구성합니다.
   */
  async quickReorder(sessionId: string, quickReorderDto: QuickReorderDto, userId?: string): Promise<CartResponseDto> {
    try {
      // 기존 주문 정보 조회
      const { data: order, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            menu_items(*)
          )
        `)
        .eq('id', quickReorderDto.orderId)
        .single();

      if (error || !order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 현재 장바구니 비우기
      await this.clearCart(sessionId, userId);

      // 주문 아이템을 장바구니에 추가
      for (const orderItem of order.order_items) {
        try {
          const addItemDto: AddCartItemDto = {
            menuItemId: orderItem.menu_item_id,
            restaurantId: order.restaurant_id,
            quantity: quickReorderDto.adjustQuantity ? 1 : orderItem.quantity,
            selectedOptions: orderItem.selected_options || [],
            specialInstructions: orderItem.special_instructions
          };

          await this.addItem(sessionId, addItemDto, userId);
        } catch (error) {
          // 품절 아이템 제외 옵션이 true인 경우 무시
          if (quickReorderDto.excludeUnavailable) {
            continue;
          }
          throw error;
        }
      }

      // 구성된 장바구니 반환
      const cart = await this.getCart(sessionId, userId);
      if (!cart) {
        throw new InternalServerErrorException('재주문 처리 중 오류가 발생했습니다.');
      }

      return cart;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('빠른 재주문 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 가격 계산 엔진
   * 장바구니의 총 가격을 계산합니다.
   */
  private async calculatePricing(cart: CartSession): Promise<PriceCalculationDto> {
    let subtotal = 0;

    // 각 아이템의 가격 계산
    for (const item of cart.items) {
      const menuItem = await this.getMenuItemInfo(item.menuItemId);
      const itemPrice = menuItem.price;
      
      // 옵션 가격 계산
      const optionsPrice = item.selectedOptions.reduce((sum, option) => sum + option.additionalPrice, 0);
      
      subtotal += (itemPrice + optionsPrice) * item.quantity;
    }

    // 배달비 계산
    const deliveryFee = await this.calculateDeliveryFee(cart.restaurantId!, subtotal);

    // 할인 적용
    const { discountAmount, appliedDiscounts } = await this.calculateDiscounts(cart.restaurantId!, subtotal);

    const totalAmount = subtotal + deliveryFee - discountAmount;

    return {
      subtotal,
      deliveryFee,
      discountAmount,
      totalAmount,
      appliedDiscounts
    };
  }

  /**
   * 배달비 계산
   */
  private async calculateDeliveryFee(restaurantId: string, subtotal: number): Promise<number> {
    const restaurant = await this.getRestaurantInfo(restaurantId);
    
    // 무료 배달 최소 금액 확인
    if (restaurant.free_delivery_min_amount && subtotal >= restaurant.free_delivery_min_amount) {
      return 0;
    }

    return restaurant.delivery_fee || 3000; // 기본 배달비
  }

  /**
   * 할인 계산
   */
  private async calculateDiscounts(restaurantId: string, subtotal: number): Promise<{ discountAmount: number; appliedDiscounts: DiscountInfoDto[] }> {
    // 향후 프로모션 시스템과 연동하여 구현
    return {
      discountAmount: 0,
      appliedDiscounts: []
    };
  }

  /**
   * 배달 정보 조회
   */
  private async getDeliveryInfo(restaurantId: string): Promise<DeliveryInfoDto> {
    const restaurant = await this.getRestaurantInfo(restaurantId);

    return {
      isAvailable: restaurant.delivery_available,
      estimatedTime: restaurant.estimated_delivery_time || 30,
      baseFee: restaurant.delivery_fee || 3000,
      additionalFee: 0,
      totalFee: restaurant.delivery_fee || 3000,
      freeDeliveryMinAmount: restaurant.free_delivery_min_amount
    };
  }

  /**
   * 헬퍼 메서드들
   */
  private async validateMenuItem(menuItemId: string, restaurantId: string): Promise<any> {
    const { data: menuItem, error } = await this.supabase
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .single();

    if (error || !menuItem) {
      throw new NotFoundException('메뉴를 찾을 수 없거나 현재 이용할 수 없습니다.');
    }

    return menuItem;
  }

  private async validateSelectedOptions(options: SelectedMenuOptionDto[] = [], menuItemId: string): Promise<void> {
    if (!options.length) return;

    for (const option of options) {
      const { data: menuOption, error } = await this.supabase
        .from('menu_options')
        .select('*')
        .eq('id', option.optionId)
        .eq('is_available', true)
        .single();

      if (error || !menuOption) {
        throw new BadRequestException(`선택한 옵션 '${option.name}'을 찾을 수 없습니다.`);
      }
    }
  }

  private createNewCart(sessionId: string, restaurantId: string): CartSession {
    return {
      id: sessionId,
      restaurantId,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private findExistingItem(items: CartItem[], addItemDto: AddCartItemDto): number {
    return items.findIndex(item => 
      item.menuItemId === addItemDto.menuItemId &&
      this.areOptionsEqual(item.selectedOptions, addItemDto.selectedOptions || [])
    );
  }

  private areOptionsEqual(options1: SelectedMenuOptionDto[], options2: SelectedMenuOptionDto[]): boolean {
    if (options1.length !== options2.length) return false;
    
    return options1.every(opt1 => 
      options2.some(opt2 => opt1.optionId === opt2.optionId)
    );
  }

  private generateCartItemId(): string {
    return `cart_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getMenuItemInfo(menuItemId: string): Promise<any> {
    const { data: menuItem, error } = await this.supabase
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .single();

    if (error || !menuItem) {
      throw new NotFoundException('메뉴 정보를 찾을 수 없습니다.');
    }

    return menuItem;
  }

  private async getRestaurantInfo(restaurantId: string): Promise<any> {
    const { data: restaurant, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new NotFoundException('레스토랑 정보를 찾을 수 없습니다.');
    }

    return restaurant;
  }

  private async syncCartToDatabase(cart: CartSession, userId: string): Promise<void> {
    // 향후 구현: 사용자별 장바구니를 데이터베이스에 저장
    // 현재는 세션 기반으로만 동작
  }

  private transformDbCartToSession(dbCart: any): CartSession {
    // 향후 구현: 데이터베이스 장바구니 데이터를 세션 형식으로 변환
    return {
      id: dbCart.id,
      restaurantId: dbCart.restaurant_id,
      items: [],
      createdAt: new Date(dbCart.created_at),
      updatedAt: new Date(dbCart.updated_at)
    };
  }

  private async transformCartToResponse(cart: CartSession): Promise<CartResponseDto> {
    const restaurant = await this.getRestaurantInfo(cart.restaurantId!);
    const items = await Promise.all(
      cart.items.map(item => this.transformCartItemToResponse(item, null))
    );

    const pricing = await this.calculatePricing(cart);
    const delivery = await this.getDeliveryInfo(cart.restaurantId!);

    const canOrder = items.length > 0 && 
                    pricing.totalAmount >= restaurant.minimum_order_amount &&
                    delivery.isAvailable;

    return {
      id: cart.id,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        imageUrl: restaurant.image_url || '',
        minimumOrderAmount: restaurant.minimum_order_amount,
        businessStatus: restaurant.is_open ? '영업 중' : '영업 종료',
        preparationTime: restaurant.preparation_time
      },
      items,
      totalItems: items.length,
      totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      pricing,
      delivery,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      canOrder,
      orderBlockReason: canOrder ? undefined : '주문 조건을 확인해주세요.'
    };
  }

  private async transformCartItemToResponse(item: CartItem, menuItem: any): Promise<CartItemResponseDto> {
    if (!menuItem) {
      menuItem = await this.getMenuItemInfo(item.menuItemId);
    }

    const optionsPrice = item.selectedOptions.reduce((sum, option) => sum + option.additionalPrice, 0);
    const totalPrice = (menuItem.price + optionsPrice) * item.quantity;

    return {
      id: item.id,
      menuItemId: item.menuItemId,
      menuName: menuItem.name,
      menuDescription: menuItem.description,
      basePrice: menuItem.price,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      optionsPrice,
      totalPrice,
      specialInstructions: item.specialInstructions,
      status: menuItem.is_available ? CartItemStatus.ACTIVE : CartItemStatus.UNAVAILABLE,
      statusMessage: menuItem.is_available ? undefined : '현재 이용할 수 없는 메뉴입니다.',
      imageUrl: menuItem.image_url || '',
      addedAt: item.addedAt,
      updatedAt: item.updatedAt
    };
  }
} 