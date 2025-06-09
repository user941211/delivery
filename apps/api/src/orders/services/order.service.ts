/**
 * 주문 서비스
 * 
 * 주문 생성, 관리, 상태 변경 등 핵심 비즈니스 로직을 제공합니다.
 */

import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateOrderDto, 
  OrderResponseDto, 
  OrderListQueryDto,
  OrderListResponseDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderStatus,
  PaymentStatus,
  DeliveryType,
  OrderPricingDto,
  PaymentInfoDto,
  DeliveryInfoDto,
  OrderRestaurantInfoDto,
  OrderItemDto
} from '../dto/order.dto';
import { CartService } from '../../cart/services/cart.service';

interface OrderEntity {
  id: string;
  orderNumber: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discountAmount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderNotes?: string;
  deliveryAddress?: any;
  estimatedReadyTime?: Date;
  estimatedDeliveryTime?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItemEntity {
  id: string;
  orderId: string;
  menuItemId: string;
  menuName: string;
  quantity: number;
  basePrice: number;
  selectedOptions: any[];
  optionsPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

@Injectable()
export class OrderService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly cartService: CartService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 주문 생성
   * 장바구니 데이터를 기반으로 새 주문을 생성합니다.
   */
  async createOrder(createOrderDto: CreateOrderDto, userId: string): Promise<OrderResponseDto> {
    try {
      // 1. 장바구니 검증 (세션 ID가 있는 경우)
      if (createOrderDto.sessionId) {
        const cartValidation = await this.cartService.validateCart(createOrderDto.sessionId, userId);
        if (!cartValidation.canProceedToOrder) {
          throw new BadRequestException('주문할 수 없는 장바구니 상태입니다. 장바구니를 확인해주세요.');
        }
      }

      // 2. 레스토랑 정보 및 영업 상태 확인
      const restaurant = await this.validateRestaurant(createOrderDto.restaurantId);

      // 3. 메뉴 아이템 검증 및 재고 확인
      await this.validateOrderItems(createOrderDto.items, createOrderDto.restaurantId);

      // 4. 배달 주소 검증 (배달 주문인 경우)
      if (createOrderDto.deliveryType === DeliveryType.DELIVERY && !createOrderDto.deliveryAddress) {
        throw new BadRequestException('배달 주문 시 배달 주소는 필수입니다.');
      }

      // 5. 가격 계산
      const pricing = await this.calculateOrderPricing(createOrderDto, restaurant);

      // 6. 주문 번호 생성
      const orderNumber = await this.generateOrderNumber();

      // 7. 데이터베이스 트랜잭션으로 주문 생성
      const order = await this.createOrderTransaction(
        createOrderDto,
        userId,
        orderNumber,
        pricing,
        restaurant
      );

      // 8. 장바구니 비우기 (세션 ID가 있는 경우)
      if (createOrderDto.sessionId) {
        await this.cartService.clearCart(createOrderDto.sessionId, userId);
      }

      // 9. 주문 응답 데이터 변환
      return await this.transformOrderToResponse(order);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주문 상세 조회
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderResponseDto> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          restaurants(id, name, phone, address, image_url),
          order_items(
            id,
            menu_item_id,
            menu_name,
            quantity,
            base_price,
            selected_options,
            options_price,
            total_price,
            special_instructions
          )
        `)
        .eq('id', orderId)
        .single();

      if (error || !order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 사용자 권한 확인
      if (userId && order.user_id !== userId) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      return await this.transformOrderToResponse(order);

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(queryDto: OrderListQueryDto, userId?: string): Promise<OrderListResponseDto> {
    try {
      const { page = 1, limit = 10, status, startDate, endDate, restaurantId } = queryDto;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('orders')
        .select(`
          *,
          restaurants(id, name, phone, address, image_url),
          order_items(
            id,
            menu_item_id,
            menu_name,
            quantity,
            base_price,
            selected_options,
            options_price,
            total_price,
            special_instructions
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 사용자별 필터링
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // 상태 필터링
      if (status) {
        query = query.eq('status', status);
      }

      // 날짜 필터링
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // 레스토랑 필터링
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw new InternalServerErrorException('주문 목록 조회 중 오류가 발생했습니다.');
      }

      // 총 개수 조회
      let countQuery = this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      if (userId) countQuery = countQuery.eq('user_id', userId);
      if (status) countQuery = countQuery.eq('status', status);
      if (startDate) countQuery = countQuery.gte('created_at', startDate);
      if (endDate) countQuery = countQuery.lte('created_at', endDate);
      if (restaurantId) countQuery = countQuery.eq('restaurant_id', restaurantId);

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new InternalServerErrorException('주문 개수 조회 중 오류가 발생했습니다.');
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const orderResponses = await Promise.all(
        orders.map(order => this.transformOrderToResponse(order))
      );

      return {
        orders: orderResponses,
        totalCount,
        currentPage: page,
        totalPages,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주문 상태 변경
   */
  async updateOrderStatus(orderId: string, updateDto: UpdateOrderStatusDto, updatedBy?: string): Promise<OrderResponseDto> {
    try {
      // 현재 주문 상태 확인
      const { data: currentOrder, error: fetchError } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 상태 전환 유효성 검증
      this.validateStatusTransition(currentOrder.status, updateDto.status);

      // 상태별 비즈니스 로직 실행
      const updateData = await this.processStatusChange(currentOrder, updateDto);

      // 주문 상태 업데이트
      const { data: updatedOrder, error: updateError } = await this.supabase
        .from('orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
        .eq('id', orderId)
        .select(`
          *,
          restaurants(id, name, phone, address, image_url),
          order_items(
            id,
            menu_item_id,
            menu_name,
            quantity,
            base_price,
            selected_options,
            options_price,
            total_price,
            special_instructions
          )
        `)
        .single();

      if (updateError) {
        throw new InternalServerErrorException('주문 상태 업데이트 중 오류가 발생했습니다.');
      }

      // 상태 변경 이력 저장
      await this.saveStatusHistory(orderId, currentOrder.status, updateDto.status, updateDto.reason, updatedBy);

      return await this.transformOrderToResponse(updatedOrder);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 상태 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주문 취소
   */
  async cancelOrder(orderId: string, cancelDto: CancelOrderDto, userId?: string): Promise<OrderResponseDto> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 사용자 권한 확인
      if (userId && order.user_id !== userId) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 취소 가능한 상태인지 확인
      const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.PAYMENT_CONFIRMED, OrderStatus.ACCEPTED];
      if (!cancellableStatuses.includes(order.status)) {
        throw new BadRequestException('현재 상태에서는 주문을 취소할 수 없습니다.');
      }

      // 취소 처리
      const updateStatusDto: UpdateOrderStatusDto = {
        status: OrderStatus.CANCELLED,
        reason: cancelDto.reason
      };

      const cancelledOrder = await this.updateOrderStatus(orderId, updateStatusDto, userId);

      // 환불 처리 (별도 서비스에서 처리)
      if (cancelDto.requestRefund && order.payment_status === PaymentStatus.COMPLETED) {
        await this.processRefund(orderId, order.total_amount);
      }

      return cancelledOrder;

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 취소 중 오류가 발생했습니다.');
    }
  }

  /**
   * 헬퍼 메서드들
   */
  private async validateRestaurant(restaurantId: string): Promise<any> {
    const { data: restaurant, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error || !restaurant) {
      throw new NotFoundException('레스토랑을 찾을 수 없습니다.');
    }

    if (!restaurant.is_open) {
      throw new BadRequestException('현재 영업시간이 아닙니다.');
    }

    return restaurant;
  }

  private async validateOrderItems(items: OrderItemDto[], restaurantId: string): Promise<void> {
    for (const item of items) {
      const { data: menuItem, error } = await this.supabase
        .from('menu_items')
        .select('*')
        .eq('id', item.menuItemId)
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .single();

      if (error || !menuItem) {
        throw new BadRequestException(`메뉴 '${item.menuName}'를 찾을 수 없거나 현재 이용할 수 없습니다.`);
      }

      // 재고 확인
      if (menuItem.stock_quantity !== null && menuItem.stock_quantity < item.quantity) {
        throw new BadRequestException(`메뉴 '${item.menuName}'의 재고가 부족합니다.`);
      }

      // 가격 검증
      if (Math.abs(menuItem.price - item.basePrice) > 0.01) {
        throw new BadRequestException(`메뉴 '${item.menuName}'의 가격이 변경되었습니다. 장바구니를 새로고침해주세요.`);
      }
    }
  }

  private async calculateOrderPricing(createOrderDto: CreateOrderDto, restaurant: any): Promise<OrderPricingDto> {
    // 메뉴 총액 계산
    const subtotal = createOrderDto.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // 배달비 계산
    let deliveryFee = 0;
    if (createOrderDto.deliveryType === DeliveryType.DELIVERY) {
      deliveryFee = restaurant.delivery_fee || 3000;
      
      // 무료 배달 최소 금액 확인
      if (restaurant.free_delivery_min_amount && subtotal >= restaurant.free_delivery_min_amount) {
        deliveryFee = 0;
      }
    }

    // 서비스 수수료 계산 (총액의 2%)
    const serviceFee = Math.round(subtotal * 0.02);

    // 할인 적용 (쿠폰 등)
    let discountAmount = 0;
    if (createOrderDto.couponCode) {
      discountAmount = await this.calculateDiscount(createOrderDto.couponCode, subtotal);
    }

    // 세금 계산 (서비스 수수료에 대한 VAT 10%)
    const tax = Math.round(serviceFee * 0.1);

    // 최종 금액
    const totalAmount = subtotal + deliveryFee + serviceFee + tax - discountAmount;

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      discountAmount,
      tax,
      totalAmount,
      appliedCoupon: createOrderDto.couponCode
    };
  }

  private async calculateDiscount(couponCode: string, subtotal: number): Promise<number> {
    // 향후 쿠폰 시스템과 연동
    return 0;
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${today}-${timestamp}`;
  }

  private async createOrderTransaction(
    createOrderDto: CreateOrderDto,
    userId: string,
    orderNumber: string,
    pricing: OrderPricingDto,
    restaurant: any
  ): Promise<any> {
    try {
      // 주문 생성
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          restaurant_id: createOrderDto.restaurantId,
          status: OrderStatus.PENDING,
          delivery_type: createOrderDto.deliveryType,
          subtotal: pricing.subtotal,
          delivery_fee: pricing.deliveryFee,
          service_fee: pricing.serviceFee,
          discount_amount: pricing.discountAmount,
          tax: pricing.tax,
          total_amount: pricing.totalAmount,
          payment_method: createOrderDto.paymentMethod,
          payment_status: PaymentStatus.PENDING,
          order_notes: createOrderDto.orderNotes,
          delivery_address: createOrderDto.deliveryAddress,
          estimated_ready_time: this.calculateEstimatedReadyTime(restaurant.preparation_time || 25),
          estimated_delivery_time: this.calculateEstimatedDeliveryTime(restaurant.preparation_time || 25, createOrderDto.deliveryType),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`주문 생성 실패: ${orderError.message}`);
      }

      // 주문 아이템 생성
      const orderItems = createOrderDto.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        menu_name: item.menuName,
        quantity: item.quantity,
        base_price: item.basePrice,
        selected_options: item.selectedOptions || [],
        options_price: item.optionsPrice,
        total_price: item.totalPrice,
        special_instructions: item.specialInstructions
      }));

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw new Error(`주문 아이템 생성 실패: ${itemsError.message}`);
      }

      // 메뉴 재고 차감
      await this.deductMenuStock(createOrderDto.items);

      return order;

    } catch (error) {
      throw new InternalServerErrorException('주문 생성 트랜잭션 실패');
    }
  }

  private calculateEstimatedReadyTime(preparationTimeMinutes: number): Date {
    const now = new Date();
    return new Date(now.getTime() + preparationTimeMinutes * 60 * 1000);
  }

  private calculateEstimatedDeliveryTime(preparationTimeMinutes: number, deliveryType: DeliveryType): Date {
    const readyTime = this.calculateEstimatedReadyTime(preparationTimeMinutes);
    
    if (deliveryType === DeliveryType.PICKUP) {
      return readyTime;
    }

    // 배달 시간 추가 (기본 15분)
    return new Date(readyTime.getTime() + 15 * 60 * 1000);
  }

  private async deductMenuStock(items: OrderItemDto[]): Promise<void> {
    for (const item of items) {
      await this.supabase
        .rpc('deduct_menu_stock', {
          menu_item_id: item.menuItemId,
          quantity: item.quantity
        });
    }
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DISPATCHED],
      [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`${currentStatus}에서 ${newStatus}로 상태 변경할 수 없습니다.`);
    }
  }

  private async processStatusChange(order: any, updateDto: UpdateOrderStatusDto): Promise<any> {
    const updateData: any = {
      status: updateDto.status
    };

    switch (updateDto.status) {
      case OrderStatus.PAYMENT_CONFIRMED:
        updateData.payment_status = PaymentStatus.COMPLETED;
        updateData.payment_confirmed_at = new Date().toISOString();
        break;

      case OrderStatus.ACCEPTED:
        updateData.accepted_at = new Date().toISOString();
        if (updateDto.estimatedTime) {
          updateData.estimated_ready_time = new Date(Date.now() + updateDto.estimatedTime * 60 * 1000).toISOString();
        }
        break;

      case OrderStatus.PREPARING:
        updateData.preparing_started_at = new Date().toISOString();
        break;

      case OrderStatus.READY:
        updateData.ready_at = new Date().toISOString();
        break;

      case OrderStatus.DISPATCHED:
        updateData.dispatched_at = new Date().toISOString();
        break;

      case OrderStatus.DELIVERED:
        updateData.delivered_at = new Date().toISOString();
        break;

      case OrderStatus.CANCELLED:
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = updateDto.reason;
        // 재고 복구
        await this.restoreMenuStock(order.id);
        break;
    }

    return updateData;
  }

  private async restoreMenuStock(orderId: string): Promise<void> {
    const { data: orderItems, error } = await this.supabase
      .from('order_items')
      .select('menu_item_id, quantity')
      .eq('order_id', orderId);

    if (error || !orderItems) return;

    for (const item of orderItems) {
      await this.supabase
        .rpc('restore_menu_stock', {
          menu_item_id: item.menu_item_id,
          quantity: item.quantity
        });
    }
  }

  private async saveStatusHistory(orderId: string, fromStatus: OrderStatus, toStatus: OrderStatus, reason?: string, updatedBy?: string): Promise<void> {
    await this.supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        from_status: fromStatus,
        to_status: toStatus,
        reason,
        changed_by: updatedBy,
        changed_at: new Date().toISOString()
      });
  }

  private async processRefund(orderId: string, amount: number): Promise<void> {
    // 향후 결제 시스템과 연동하여 환불 처리
    await this.supabase
      .from('order_refunds')
      .insert({
        order_id: orderId,
        refund_amount: amount,
        refund_status: 'processing',
        requested_at: new Date().toISOString()
      });
  }

  private async transformOrderToResponse(orderData: any): Promise<OrderResponseDto> {
    return {
      id: orderData.id,
      orderNumber: orderData.order_number,
      userId: orderData.user_id,
      restaurant: {
        id: orderData.restaurants.id,
        name: orderData.restaurants.name,
        phone: orderData.restaurants.phone,
        address: orderData.restaurants.address,
        imageUrl: orderData.restaurants.image_url
      },
      items: orderData.order_items?.map((item: any) => ({
        menuItemId: item.menu_item_id,
        menuName: item.menu_name,
        quantity: item.quantity,
        basePrice: item.base_price,
        selectedOptions: item.selected_options || [],
        optionsPrice: item.options_price,
        totalPrice: item.total_price,
        specialInstructions: item.special_instructions
      })) || [],
      status: orderData.status,
      pricing: {
        subtotal: orderData.subtotal,
        deliveryFee: orderData.delivery_fee,
        serviceFee: orderData.service_fee,
        discountAmount: orderData.discount_amount,
        tax: orderData.tax,
        totalAmount: orderData.total_amount,
        appliedCoupon: orderData.applied_coupon
      },
      payment: {
        method: orderData.payment_method,
        status: orderData.payment_status,
        transactionId: orderData.transaction_id,
        authorizationCode: orderData.authorization_code,
        paidAt: orderData.payment_confirmed_at ? new Date(orderData.payment_confirmed_at) : undefined,
        failureReason: orderData.payment_failure_reason
      },
      delivery: {
        type: orderData.delivery_type,
        address: orderData.delivery_address,
        estimatedTime: orderData.estimated_delivery_time ? 
          Math.round((new Date(orderData.estimated_delivery_time).getTime() - Date.now()) / (60 * 1000)) : 0,
        driverId: orderData.driver_id,
        driverName: orderData.driver_name,
        driverPhone: orderData.driver_phone,
        dispatchedAt: orderData.dispatched_at ? new Date(orderData.dispatched_at) : undefined,
        deliveredAt: orderData.delivered_at ? new Date(orderData.delivered_at) : undefined
      },
      orderNotes: orderData.order_notes,
      createdAt: new Date(orderData.created_at),
      updatedAt: new Date(orderData.updated_at),
      cancellationReason: orderData.cancellation_reason,
      estimatedReadyTime: orderData.estimated_ready_time ? new Date(orderData.estimated_ready_time) : undefined,
      estimatedDeliveryTime: orderData.estimated_delivery_time ? new Date(orderData.estimated_delivery_time) : undefined
    };
  }
} 