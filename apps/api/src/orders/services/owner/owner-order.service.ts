/**
 * 점주용 주문 처리 서비스
 * 
 * 점주가 주문을 관리하고 처리하기 위한 모든 비즈니스 로직을 담당합니다.
 */

import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PaymentService } from '../../../payments/services/payment.service';
import { NotificationService } from '../../../notifications/services/notification.service';

import {
  OwnerOrderStatus,
  OrderRejectionReason,
  OwnerOrderQueryDto,
  OwnerOrderDetailDto,
  OwnerOrderListResponseDto,
  OwnerOrderStatsDto,
  UpdateOrderStatusDto,
  RejectOrderDto,
  SetCookingTimeDto,
  BulkOrderActionDto,
  OrderStatusNotificationDto
} from '../../dto/owner/owner-order.dto';

import {
  OwnerOrderServiceInterface,
  OrderEventType,
  OrderEventData,
  OrderErrorType,
  OrderProcessResult
} from '../../interfaces/owner/owner-order.interface';

import { OrderStatus, PaymentStatus } from '../../dto/order.dto';

interface OrderEntity {
  id: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string;
  status: OwnerOrderStatus;
  paymentStatus: PaymentStatus;
  items: any[];
  totalAmount: number;
  deliveryAddress: any;
  specialRequests?: string;
  estimatedCookingTime?: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cookingStartedAt?: Date;
  cookingCompletedAt?: Date;
  deliveredAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: OrderRejectionReason;
  rejectionDetails?: string;
}

interface CustomerEntity {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
}

interface RestaurantEntity {
  id: string;
  ownerId: string;
  name: string;
  isOpen: boolean;
  maxConcurrentOrders: number;
  averageCookingTime: number;
}

@Injectable()
export class OwnerOrderService implements OwnerOrderServiceInterface {
  private readonly logger = new Logger(OwnerOrderService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 점주별 주문 목록 조회
   * 점주의 매장에 대한 주문 목록을 필터링 및 페이지네이션으로 조회합니다.
   */
  async getOrdersForOwner(ownerId: string, restaurantId: string, queryDto: OwnerOrderQueryDto): Promise<OwnerOrderListResponseDto> {
    try {
      this.logger.log(`Fetching orders for owner: ${ownerId}, restaurant: ${restaurantId}`);

      // 점주 권한 확인
      await this.validateOwnerAccess(ownerId, restaurantId);

      const { page = 1, limit = 20, status, paymentStatus, startDate, endDate, orderNumber, customerName, sortBy = 'createdAt', sortOrder = 'DESC', urgentOnly } = queryDto;
      const offset = (page - 1) * limit;

      // 기본 쿼리 구성
      let query = this.supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order(sortBy, { ascending: sortOrder === 'ASC' })
        .range(offset, offset + limit - 1);

      // 필터 적용
      if (status) {
        query = query.eq('status', status);
      }

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (orderNumber) {
        query = query.ilike('order_number', `%${orderNumber}%`);
      }

      if (customerName) {
        query = query.ilike('customers.name', `%${customerName}%`);
      }

      if (urgentOnly) {
        // 30분 이상 대기 중인 주문을 긴급으로 간주
        const urgentTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        query = query.lte('created_at', urgentTime);
        query = query.in('status', [OwnerOrderStatus.NEW, OwnerOrderStatus.CONFIRMED]);
      }

      const { data: orders, error, count } = await query;

      if (error) {
        throw new InternalServerErrorException('주문 목록 조회 중 오류가 발생했습니다.');
      }

      // 총 개수 조회
      let countQuery = this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      if (status) countQuery = countQuery.eq('status', status);
      if (paymentStatus) countQuery = countQuery.eq('payment_status', paymentStatus);
      if (startDate) countQuery = countQuery.gte('created_at', startDate);
      if (endDate) countQuery = countQuery.lte('created_at', endDate);

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        throw new InternalServerErrorException('주문 개수 조회 중 오류가 발생했습니다.');
      }

      const totalPages = Math.ceil((totalCount || 0) / limit);
      const orderDetails = orders.map(order => this.mapOrderEntityToDetail(order));

      return {
        orders: orderDetails,
        totalCount: totalCount || 0,
        currentPage: page,
        totalPages,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };
    } catch (error) {
      this.logger.error('Owner orders fetch failed:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 특정 주문 상세 조회
   * 점주가 특정 주문의 상세 정보를 조회합니다.
   */
  async getOrderDetail(ownerId: string, orderId: string): Promise<OwnerOrderDetailDto> {
    try {
      this.logger.log(`Fetching order detail: ${orderId} for owner: ${ownerId}`);

      // 점주 권한 확인
      const hasAccess = await this.validateOwnerOrderAccess(ownerId, orderId);
      if (!hasAccess) {
        throw new ForbiddenException('해당 주문에 대한 권한이 없습니다.');
      }

      const { data: order, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          ),
          order_status_history (
            status,
            changed_at,
            changed_by,
            memo
          )
        `)
        .eq('id', orderId)
        .single();

      if (error || !order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      return this.mapOrderEntityToDetail(order);
    } catch (error) {
      this.logger.error('Order detail fetch failed:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 상세 조회에 실패했습니다.');
    }
  }

  /**
   * 주문 상태 업데이트
   * 점주가 주문의 상태를 변경합니다.
   */
  async updateOrderStatus(ownerId: string, orderId: string, updateDto: UpdateOrderStatusDto): Promise<OwnerOrderDetailDto> {
    try {
      this.logger.log(`Updating order status: ${orderId} to ${updateDto.status} by owner: ${ownerId}`);

      // 점주 권한 확인
      const hasAccess = await this.validateOwnerOrderAccess(ownerId, orderId);
      if (!hasAccess) {
        throw new ForbiddenException('해당 주문에 대한 권한이 없습니다.');
      }

      // 현재 주문 정보 조회
      const currentOrder = await this.getOrderById(orderId);

      // 상태 변경 유효성 검증
      this.validateStatusTransition(currentOrder.status, updateDto.status);

      // 상태별 업데이트 데이터 준비
      const updateData: any = {
        status: updateDto.status,
        updated_at: new Date().toISOString()
      };

      // 조리 시간 설정
      if (updateDto.estimatedCookingTime) {
        updateData.estimated_cooking_time = updateDto.estimatedCookingTime;
      }

      // 상태별 타임스탬프 설정
      switch (updateDto.status) {
        case OwnerOrderStatus.CONFIRMED:
          updateData.confirmed_at = new Date().toISOString();
          break;
        case OwnerOrderStatus.PREPARING:
          updateData.cooking_started_at = new Date().toISOString();
          break;
        case OwnerOrderStatus.READY:
          updateData.cooking_completed_at = new Date().toISOString();
          break;
        case OwnerOrderStatus.COMPLETED:
          updateData.delivered_at = new Date().toISOString();
          break;
      }

      // 주문 상태 업데이트
      const { data: updatedOrder, error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          )
        `)
        .single();

      if (error) {
        throw new InternalServerErrorException('주문 상태 업데이트에 실패했습니다.');
      }

      // 상태 변경 이력 기록
      await this.logStatusChange(orderId, {
        fromStatus: currentOrder.status,
        toStatus: updateDto.status,
        changedBy: ownerId,
        reason: updateDto.memo,
        timestamp: new Date()
      });

      // 실시간 알림 전송 (점주용)
      await this.notificationService.sendOrderStatusChangeNotification(
        ownerId,
        currentOrder.restaurantId,
        {
          orderId,
          orderNumber: currentOrder.orderNumber,
          previousStatus: currentOrder.status,
          currentStatus: updateDto.status,
          reason: updateDto.memo
        }
      );

      // 이벤트 발생
      await this.emitOrderEvent(orderId, OrderEventType.ORDER_CONFIRMED, {
        previousStatus: currentOrder.status,
        newStatus: updateDto.status,
        estimatedCookingTime: updateDto.estimatedCookingTime,
        customerNotified: updateDto.notifyCustomer
      });

      // 고객 알림 발송 (옵션)
      if (updateDto.notifyCustomer) {
        await this.notifyCustomerStatusChange(currentOrder.customerId, {
          orderId,
          previousStatus: currentOrder.status,
          newStatus: updateDto.status,
          changedAt: new Date(),
          changedBy: ownerId,
          reason: updateDto.memo,
          customerNotified: true
        });
      }

      this.logger.log(`Order status updated successfully: ${orderId} -> ${updateDto.status}`);

      return this.mapOrderEntityToDetail(updatedOrder);
    } catch (error) {
      this.logger.error('Order status update failed:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 상태 업데이트에 실패했습니다.');
    }
  }

  /**
   * 주문 거부 처리
   * 점주가 주문을 거부하고 환불을 처리합니다.
   */
  async rejectOrder(ownerId: string, orderId: string, rejectDto: RejectOrderDto): Promise<OwnerOrderDetailDto> {
    try {
      this.logger.log(`Rejecting order: ${orderId} by owner: ${ownerId}`);

      // 점주 권한 확인
      const hasAccess = await this.validateOwnerOrderAccess(ownerId, orderId);
      if (!hasAccess) {
        throw new ForbiddenException('해당 주문에 대한 권한이 없습니다.');
      }

      // 현재 주문 정보 조회
      const currentOrder = await this.getOrderById(orderId);

      // 거부 가능한 상태 확인
      const rejectableStatuses = [OwnerOrderStatus.NEW, OwnerOrderStatus.CONFIRMED];
      if (!rejectableStatuses.includes(currentOrder.status)) {
        throw new BadRequestException('현재 상태에서는 주문을 거부할 수 없습니다.');
      }

      // 주문 거부 처리
      const updateData = {
        status: OwnerOrderStatus.REJECTED,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectDto.reason,
        rejection_details: rejectDto.detailReason,
        customer_message: rejectDto.customerMessage,
        updated_at: new Date().toISOString()
      };

      const { data: updatedOrder, error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          )
        `)
        .single();

      if (error) {
        throw new InternalServerErrorException('주문 거부 처리에 실패했습니다.');
      }

      // 자동 환불 처리
      if (rejectDto.autoRefund && currentOrder.paymentStatus === PaymentStatus.COMPLETED) {
        try {
          // 결제 서비스를 통한 환불 처리
          const payment = await this.paymentService.getPaymentByOrderId(orderId);
          await this.paymentService.cancelPayment(payment.paymentKey, {
            cancelReason: `주문 거부: ${rejectDto.reason}`,
            cancelAmount: currentOrder.totalAmount
          });

          this.logger.log(`Auto refund processed for rejected order: ${orderId}`);
        } catch (refundError) {
          this.logger.error(`Auto refund failed for order ${orderId}:`, refundError);
          // 환불 실패 시에도 주문 거부는 유지하되 로그만 남김
        }
      }

      // 상태 변경 이력 기록
      await this.logStatusChange(orderId, {
        fromStatus: currentOrder.status,
        toStatus: OwnerOrderStatus.REJECTED,
        changedBy: ownerId,
        reason: `거부 사유: ${rejectDto.reason}${rejectDto.detailReason ? ` - ${rejectDto.detailReason}` : ''}`,
        timestamp: new Date()
      });

      // 실시간 알림 전송 (점주용)
      await this.notificationService.sendOrderCancelledNotification(
        ownerId,
        currentOrder.restaurantId,
        {
          orderId,
          orderNumber: currentOrder.orderNumber,
          reason: rejectDto.reason,
          cancelledBy: 'restaurant'
        }
      );

      // 이벤트 발생
      await this.emitOrderEvent(orderId, OrderEventType.ORDER_REJECTED, {
        previousStatus: currentOrder.status,
        newStatus: OwnerOrderStatus.REJECTED,
        rejectionReason: rejectDto.reason,
        customerNotified: true
      });

      // 고객에게 거부 알림 발송
      await this.notifyCustomerStatusChange(currentOrder.customerId, {
        orderId,
        previousStatus: currentOrder.status,
        newStatus: OwnerOrderStatus.REJECTED,
        changedAt: new Date(),
        changedBy: ownerId,
        reason: rejectDto.customerMessage || `죄송합니다. ${rejectDto.reason}으로 인해 주문을 처리할 수 없습니다.`,
        customerNotified: true
      });

      this.logger.log(`Order rejected successfully: ${orderId}`);

      return this.mapOrderEntityToDetail(updatedOrder);
    } catch (error) {
      this.logger.error('Order rejection failed:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 거부 처리에 실패했습니다.');
    }
  }

  /**
   * 조리 시간 설정
   * 점주가 특정 주문의 예상 조리 시간을 설정합니다.
   */
  async setCookingTime(ownerId: string, orderId: string, setCookingTimeDto: SetCookingTimeDto): Promise<OwnerOrderDetailDto> {
    try {
      this.logger.log(`Setting cooking time for order: ${orderId} to ${setCookingTimeDto.estimatedCookingTime} minutes`);

      // 점주 권한 확인
      const hasAccess = await this.validateOwnerOrderAccess(ownerId, orderId);
      if (!hasAccess) {
        throw new ForbiddenException('해당 주문에 대한 권한이 없습니다.');
      }

      // 현재 주문 정보 조회
      const currentOrder = await this.getOrderById(orderId);

      // 조리 시간 설정 가능한 상태 확인
      const allowedStatuses = [OwnerOrderStatus.NEW, OwnerOrderStatus.CONFIRMED, OwnerOrderStatus.PREPARING];
      if (!allowedStatuses.includes(currentOrder.status)) {
        throw new BadRequestException('현재 상태에서는 조리 시간을 설정할 수 없습니다.');
      }

      // 조리 시간 업데이트
      const { data: updatedOrder, error } = await this.supabase
        .from('orders')
        .update({
          estimated_cooking_time: setCookingTimeDto.estimatedCookingTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          )
        `)
        .single();

      if (error) {
        throw new InternalServerErrorException('조리 시간 설정에 실패했습니다.');
      }

      // 이벤트 발생
      await this.emitOrderEvent(orderId, OrderEventType.COOKING_TIME_UPDATED, {
        estimatedCookingTime: setCookingTimeDto.estimatedCookingTime,
        reason: setCookingTimeDto.reason,
        customerNotified: setCookingTimeDto.notifyCustomer
      });

      // 고객 알림 발송 (옵션)
      if (setCookingTimeDto.notifyCustomer) {
        await this.notifyCustomerCookingTimeUpdate(currentOrder.customerId, orderId, setCookingTimeDto.estimatedCookingTime, setCookingTimeDto.reason);
      }

      this.logger.log(`Cooking time set successfully: ${orderId} -> ${setCookingTimeDto.estimatedCookingTime} minutes`);

      return this.mapOrderEntityToDetail(updatedOrder);
    } catch (error) {
      this.logger.error('Cooking time setting failed:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('조리 시간 설정에 실패했습니다.');
    }
  }

  /**
   * 주문 일괄 처리
   * 여러 주문을 한 번에 처리합니다.
   */
  async bulkOrderAction(ownerId: string, restaurantId: string, bulkActionDto: BulkOrderActionDto): Promise<{
    success: string[];
    failed: Array<{ orderId: string; reason: string }>;
  }> {
    try {
      this.logger.log(`Bulk order action: ${bulkActionDto.action} for ${bulkActionDto.orderIds.length} orders`);

      // 점주 권한 확인
      await this.validateOwnerAccess(ownerId, restaurantId);

      const results = {
        success: [] as string[],
        failed: [] as Array<{ orderId: string; reason: string }>
      };

      // 각 주문에 대해 액션 실행
      for (const orderId of bulkActionDto.orderIds) {
        try {
          switch (bulkActionDto.action) {
            case 'confirm':
              await this.updateOrderStatus(ownerId, orderId, {
                status: OwnerOrderStatus.CONFIRMED,
                memo: bulkActionDto.reason,
                notifyCustomer: true
              });
              break;

            case 'start_cooking':
              await this.updateOrderStatus(ownerId, orderId, {
                status: OwnerOrderStatus.PREPARING,
                estimatedCookingTime: bulkActionDto.estimatedCookingTime,
                memo: bulkActionDto.reason,
                notifyCustomer: true
              });
              break;

            case 'reject':
              await this.rejectOrder(ownerId, orderId, {
                reason: OrderRejectionReason.OTHER,
                detailReason: bulkActionDto.reason || '일괄 처리',
                autoRefund: true
              });
              break;

            default:
              throw new Error('지원하지 않는 액션입니다.');
          }

          results.success.push(orderId);
        } catch (error) {
          results.failed.push({
            orderId,
            reason: error instanceof Error ? error.message : '알 수 없는 오류'
          });
        }
      }

      this.logger.log(`Bulk action completed: ${results.success.length} success, ${results.failed.length} failed`);

      return results;
    } catch (error) {
      this.logger.error('Bulk order action failed:', error);
      throw new InternalServerErrorException('일괄 처리에 실패했습니다.');
    }
  }

  /**
   * 점주용 주문 통계 조회
   * 점주의 매장에 대한 주문 통계를 조회합니다.
   */
  async getOrderStats(ownerId: string, restaurantId: string, startDate?: string, endDate?: string): Promise<OwnerOrderStatsDto> {
    try {
      this.logger.log(`Fetching order stats for restaurant: ${restaurantId}`);

      // 점주 권한 확인
      await this.validateOwnerAccess(ownerId, restaurantId);

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // 오늘 통계
      const todayStats = await this.calculateDayStats(restaurantId, startOfToday);

      // 이번 주 통계
      const weekStats = await this.calculatePeriodStats(restaurantId, startOfWeek);

      // 이번 달 통계
      const monthStats = await this.calculatePeriodStats(restaurantId, startOfMonth);

      // 실시간 대기 주문 통계
      const pendingStats = await this.calculatePendingStats(restaurantId);

      return {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        pending: pendingStats
      };
    } catch (error) {
      this.logger.error('Order stats fetch failed:', error);
      throw new InternalServerErrorException('주문 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 실시간 대기 중인 주문 조회
   * 현재 처리가 필요한 주문들을 조회합니다.
   */
  async getPendingOrders(ownerId: string, restaurantId: string): Promise<OwnerOrderDetailDto[]> {
    try {
      this.logger.log(`Fetching pending orders for restaurant: ${restaurantId}`);

      // 점주 권한 확인
      await this.validateOwnerAccess(ownerId, restaurantId);

      const { data: orders, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone_number,
            email
          ),
          order_items (
            id,
            menu_id,
            menu_name,
            quantity,
            unit_price,
            total_price,
            options,
            special_requests
          )
        `)
        .eq('restaurant_id', restaurantId)
        .in('status', [OwnerOrderStatus.NEW, OwnerOrderStatus.CONFIRMED, OwnerOrderStatus.PREPARING])
        .order('created_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException('대기 주문 조회 중 오류가 발생했습니다.');
      }

      return orders.map(order => this.mapOrderEntityToDetail(order));
    } catch (error) {
      this.logger.error('Pending orders fetch failed:', error);
      throw new InternalServerErrorException('대기 주문 조회에 실패했습니다.');
    }
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  /**
   * 점주 매장 접근 권한 확인
   */
  private async validateOwnerAccess(ownerId: string, restaurantId: string): Promise<void> {
    const { data: restaurant, error } = await this.supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new NotFoundException('매장을 찾을 수 없습니다.');
    }

    if (restaurant.owner_id !== ownerId) {
      throw new ForbiddenException('해당 매장에 대한 권한이 없습니다.');
    }
  }

  /**
   * 점주 주문 접근 권한 확인
   */
  private async validateOwnerOrderAccess(ownerId: string, orderId: string): Promise<boolean> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select(`
        restaurant_id,
        restaurants:restaurant_id (
          owner_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return false;
    }

    return (order.restaurants as any)?.owner_id === ownerId;
  }

  /**
   * 주문 상태 전환 유효성 검증
   */
  private validateStatusTransition(currentStatus: OwnerOrderStatus, newStatus: OwnerOrderStatus): void {
    const allowedTransitions: Record<OwnerOrderStatus, OwnerOrderStatus[]> = {
      [OwnerOrderStatus.NEW]: [OwnerOrderStatus.CONFIRMED, OwnerOrderStatus.REJECTED],
      [OwnerOrderStatus.CONFIRMED]: [OwnerOrderStatus.PREPARING, OwnerOrderStatus.REJECTED],
      [OwnerOrderStatus.PREPARING]: [OwnerOrderStatus.READY],
      [OwnerOrderStatus.READY]: [OwnerOrderStatus.COMPLETED],
      [OwnerOrderStatus.COMPLETED]: [],
      [OwnerOrderStatus.REJECTED]: [],
      [OwnerOrderStatus.CANCELLED]: []
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`${currentStatus}에서 ${newStatus}로 상태 변경이 불가능합니다.`);
    }
  }

  /**
   * 주문 정보 조회 (내부용)
   */
  private async getOrderById(orderId: string): Promise<OrderEntity> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return {
      id: order.id,
      orderNumber: order.order_number,
      restaurantId: order.restaurant_id,
      customerId: order.customer_id,
      status: order.status,
      paymentStatus: order.payment_status,
      items: order.items,
      totalAmount: order.total_amount,
      deliveryAddress: order.delivery_address,
      specialRequests: order.special_requests,
      estimatedCookingTime: order.estimated_cooking_time,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      confirmedAt: order.confirmed_at ? new Date(order.confirmed_at) : undefined,
      cookingStartedAt: order.cooking_started_at ? new Date(order.cooking_started_at) : undefined,
      cookingCompletedAt: order.cooking_completed_at ? new Date(order.cooking_completed_at) : undefined,
      deliveredAt: order.delivered_at ? new Date(order.delivered_at) : undefined,
      rejectedAt: order.rejected_at ? new Date(order.rejected_at) : undefined,
      rejectionReason: order.rejection_reason,
      rejectionDetails: order.rejection_details
    };
  }

  /**
   * 상태 변경 이력 기록
   */
  private async logStatusChange(orderId: string, change: {
    fromStatus: OwnerOrderStatus;
    toStatus: OwnerOrderStatus;
    changedBy: string;
    reason?: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await this.supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          from_status: change.fromStatus,
          to_status: change.toStatus,
          changed_by: change.changedBy,
          reason: change.reason,
          changed_at: change.timestamp.toISOString()
        });
    } catch (error) {
      this.logger.error('Status change logging failed:', error);
    }
  }

  /**
   * 주문 이벤트 발생
   */
  private async emitOrderEvent(orderId: string, eventType: OrderEventType, data: any): Promise<void> {
    try {
      const eventData: OrderEventData = {
        eventType,
        timestamp: new Date(),
        orderId,
        restaurantId: '', // 실제로는 주문에서 추출
        data
      };

      await this.supabase
        .from('order_events')
        .insert({
          order_id: orderId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      this.logger.error('Order event emission failed:', error);
    }
  }

  /**
   * 고객 상태 변경 알림
   */
  private async notifyCustomerStatusChange(customerId: string, notification: OrderStatusNotificationDto): Promise<void> {
    try {
      // 실제로는 알림 서비스를 통해 고객에게 푸시/SMS 발송
      this.logger.log(`Notifying customer ${customerId} about order status change: ${notification.orderId}`);
    } catch (error) {
      this.logger.error('Customer notification failed:', error);
    }
  }

  /**
   * 고객 조리 시간 알림
   */
  private async notifyCustomerCookingTimeUpdate(customerId: string, orderId: string, cookingTime: number, reason?: string): Promise<void> {
    try {
      this.logger.log(`Notifying customer ${customerId} about cooking time update: ${orderId} -> ${cookingTime} minutes`);
    } catch (error) {
      this.logger.error('Cooking time notification failed:', error);
    }
  }

  /**
   * 일일 통계 계산
   */
  private async calculateDayStats(restaurantId: string, startDate: string): Promise<any> {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('status, total_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate);

    if (error) return this.getEmptyDayStats();

    const totalOrders = orders.length;
    const newOrders = orders.filter(o => o.status === OwnerOrderStatus.NEW).length;
    const confirmedOrders = orders.filter(o => o.status === OwnerOrderStatus.CONFIRMED).length;
    const preparingOrders = orders.filter(o => o.status === OwnerOrderStatus.PREPARING).length;
    const completedOrders = orders.filter(o => o.status === OwnerOrderStatus.COMPLETED).length;
    const rejectedOrders = orders.filter(o => o.status === OwnerOrderStatus.REJECTED).length;
    const totalRevenue = orders
      .filter(o => o.status === OwnerOrderStatus.COMPLETED)
      .reduce((sum, o) => sum + o.total_amount, 0);

    return {
      totalOrders,
      newOrders,
      confirmedOrders,
      preparingOrders,
      completedOrders,
      rejectedOrders,
      totalRevenue,
      averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0
    };
  }

  /**
   * 기간 통계 계산
   */
  private async calculatePeriodStats(restaurantId: string, startDate: string): Promise<any> {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate);

    if (error) return this.getEmptyPeriodStats();

    const completedOrders = orders.filter(o => o.status === OwnerOrderStatus.COMPLETED);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);

    return {
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
      peakHour: '12:00', // 실제로는 시간대별 분석 필요
      popularMenuItem: '인기 메뉴' // 실제로는 메뉴별 분석 필요
    };
  }

  /**
   * 대기 주문 통계 계산
   */
  private async calculatePendingStats(restaurantId: string): Promise<any> {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('status, created_at')
      .eq('restaurant_id', restaurantId)
      .in('status', [OwnerOrderStatus.NEW, OwnerOrderStatus.CONFIRMED, OwnerOrderStatus.PREPARING]);

    if (error) return this.getEmptyPendingStats();

    const newOrdersCount = orders.filter(o => o.status === OwnerOrderStatus.NEW).length;
    const preparingOrdersCount = orders.filter(o => o.status === OwnerOrderStatus.PREPARING).length;

    // 대기 시간 계산
    const now = new Date();
    const waitTimes = orders.map(o => now.getTime() - new Date(o.created_at).getTime());
    const averageWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length / (1000 * 60) : 0;
    const longestWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) / (1000 * 60) : 0;

    return {
      newOrdersCount,
      preparingOrdersCount,
      averageWaitTime,
      longestWaitTime
    };
  }

  /**
   * 빈 통계 객체 반환
   */
  private getEmptyDayStats(): any {
    return {
      totalOrders: 0,
      newOrders: 0,
      confirmedOrders: 0,
      preparingOrders: 0,
      completedOrders: 0,
      rejectedOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };
  }

  private getEmptyPeriodStats(): any {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      peakHour: '',
      popularMenuItem: ''
    };
  }

  private getEmptyPendingStats(): any {
    return {
      newOrdersCount: 0,
      preparingOrdersCount: 0,
      averageWaitTime: 0,
      longestWaitTime: 0
    };
  }

  /**
   * 주문 엔티티를 DTO로 변환
   */
  private mapOrderEntityToDetail(order: any): OwnerOrderDetailDto {
    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      customer: {
        id: order.customers?.id || order.customer_id,
        name: order.customers?.name || '',
        phoneNumber: order.customers?.phone_number || '',
        email: order.customers?.email
      },
      deliveryAddress: order.delivery_address || {},
      items: order.order_items || [],
      pricing: {
        subtotal: order.subtotal || 0,
        deliveryFee: order.delivery_fee || 0,
        discountAmount: order.discount_amount || 0,
        totalAmount: order.total_amount || 0
      },
      specialRequests: order.special_requests,
      estimatedCookingTime: order.estimated_cooking_time,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      confirmedAt: order.confirmed_at ? new Date(order.confirmed_at) : undefined,
      cookingStartedAt: order.cooking_started_at ? new Date(order.cooking_started_at) : undefined,
      cookingCompletedAt: order.cooking_completed_at ? new Date(order.cooking_completed_at) : undefined,
      deliveredAt: order.delivered_at ? new Date(order.delivered_at) : undefined,
      rejection: order.rejected_at ? {
        reason: order.rejection_reason,
        detailReason: order.rejection_details,
        rejectedAt: new Date(order.rejected_at),
        rejectedBy: 'owner' // 실제로는 사용자 정보 조회 필요
      } : undefined,
      statusHistory: order.order_status_history || []
    };
  }
} 