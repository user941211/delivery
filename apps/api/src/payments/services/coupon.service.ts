/**
 * 쿠폰 및 할인 시스템 서비스
 * 
 * 쿠폰 생성, 관리, 적용 및 할인 계산을 담당합니다.
 */

import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  CouponType,
  CouponStatus,
  DiscountTarget,
  CreateCouponDto,
  CouponResponseDto,
  ApplyCouponDto,
  CalculateDiscountDto,
  DiscountCalculationResultDto,
  CouponConditionDto
} from '../dto/coupon.dto';

/**
 * 쿠폰 엔티티 인터페이스
 */
interface CouponEntity {
  id: string;
  name: string;
  description: string;
  code: string;
  type: CouponType;
  discount_value: number;
  target: DiscountTarget;
  status: CouponStatus;
  valid_from: string;
  valid_until: string;
  conditions: any;
  restaurant_id?: string;
  total_used_count: number;
  is_active: boolean;
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

/**
 * 쿠폰 사용 이력 인터페이스
 */
interface CouponUsageEntity {
  id: string;
  coupon_id: string;
  coupon_code: string;
  order_id: string;
  customer_id: string;
  discount_amount: number;
  used_at: string;
  restaurant_id: string;
  is_cancelled: boolean;
  cancelled_at?: string;
}

/**
 * 쿠폰 및 할인 시스템 서비스 클래스
 */
@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 쿠폰 생성
   */
  async createCoupon(createCouponDto: CreateCouponDto): Promise<CouponResponseDto> {
    try {
      this.logger.log(`Creating coupon with code: ${createCouponDto.code}`);

      // 쿠폰 코드 중복 확인
      await this.validateCouponCodeUniqueness(createCouponDto.code);

      // 쿠폰 데이터 검증
      this.validateCouponData(createCouponDto);

      // 쿠폰 생성
      const couponData = {
        name: createCouponDto.name,
        description: createCouponDto.description,
        code: createCouponDto.code.toUpperCase(),
        type: createCouponDto.type,
        discount_value: createCouponDto.discountValue,
        target: createCouponDto.target,
        status: CouponStatus.ACTIVE,
        valid_from: createCouponDto.validFrom,
        valid_until: createCouponDto.validUntil,
        conditions: createCouponDto.conditions,
        restaurant_id: createCouponDto.restaurantId,
        total_used_count: 0,
        is_active: createCouponDto.isActive ?? true,
        auto_apply: createCouponDto.autoApply ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {}
      };

      const { data: coupon, error } = await this.supabase
        .from('coupons')
        .insert(couponData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create coupon:', error);
        throw new BadRequestException('쿠폰 생성에 실패했습니다.');
      }

      this.logger.log(`Coupon created successfully: ${coupon.id}`);
      return this.mapCouponEntityToResponseDto(coupon);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create coupon: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 목록 조회
   */
  async getCoupons(options: {
    page?: number;
    limit?: number;
    type?: CouponType;
    status?: CouponStatus;
    restaurantId?: string;
    isActive?: boolean;
  } = {}): Promise<{ coupons: CouponResponseDto[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        restaurantId,
        isActive
      } = options;

      let query = this.supabase
        .from('coupons')
        .select('*', { count: 'exact' });

      // 필터 적용
      if (type) {
        query = query.eq('type', type);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: coupons, error, count } = await query;

      if (error) {
        this.logger.error('Failed to get coupons:', error);
        throw new BadRequestException('쿠폰 목록 조회에 실패했습니다.');
      }

      return {
        coupons: (coupons || []).map(coupon => this.mapCouponEntityToResponseDto(coupon)),
        total: count || 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get coupons: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 상세 조회
   */
  async getCouponById(couponId: string): Promise<CouponResponseDto> {
    try {
      const { data: coupon, error } = await this.supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (error || !coupon) {
        throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
      }

      return this.mapCouponEntityToResponseDto(coupon);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get coupon: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 코드로 조회
   */
  async getCouponByCode(couponCode: string): Promise<CouponResponseDto> {
    try {
      const { data: coupon, error } = await this.supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (error || !coupon) {
        throw new NotFoundException('유효하지 않은 쿠폰 코드입니다.');
      }

      return this.mapCouponEntityToResponseDto(coupon);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get coupon by code: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 적용
   */
  async applyCoupon(applyCouponDto: ApplyCouponDto): Promise<{ success: boolean; discountAmount: number; message?: string }> {
    try {
      this.logger.log(`Applying coupon: ${applyCouponDto.couponCode} to order: ${applyCouponDto.orderId}`);

      // 쿠폰 조회 및 유효성 검증
      const coupon = await this.getCouponByCode(applyCouponDto.couponCode);
      const validationResult = await this.validateCouponUsage(coupon, applyCouponDto);

      if (!validationResult.isValid) {
        return {
          success: false,
          discountAmount: 0,
          message: validationResult.reason
        };
      }

      // 주문 정보 조회 (할인 계산을 위해)
      const orderInfo = await this.getOrderInfo(applyCouponDto.orderId);
      
      // 할인 금액 계산
      const discountAmount = this.calculateDiscountAmount(coupon, orderInfo);

      // 쿠폰 사용 이력 저장
      await this.saveCouponUsage({
        couponId: coupon.id,
        couponCode: coupon.code,
        orderId: applyCouponDto.orderId,
        customerId: applyCouponDto.customerId || orderInfo.customerId,
        discountAmount,
        restaurantId: orderInfo.restaurantId
      });

      // 쿠폰 사용 횟수 업데이트
      await this.updateCouponUsageCount(coupon.id);

      this.logger.log(`Coupon applied successfully: ${discountAmount} discount`);
      return {
        success: true,
        discountAmount,
        message: '쿠폰이 성공적으로 적용되었습니다.'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to apply coupon: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 할인 계산
   */
  async calculateDiscount(calculateDiscountDto: CalculateDiscountDto): Promise<DiscountCalculationResultDto> {
    try {
      this.logger.log(`Calculating discount for ${calculateDiscountDto.couponCodes.length} coupons`);

      const appliedCoupons: string[] = [];
      let totalDiscountAmount = 0;
      let discountedDeliveryFee = calculateDiscountDto.deliveryFee;
      let hasError = false;
      let errorMessage = '';

      // 각 쿠폰에 대해 할인 계산
      for (const couponCode of calculateDiscountDto.couponCodes) {
        try {
          const coupon = await this.getCouponByCode(couponCode);
          
          // 쿠폰 유효성 검증 (간단한 버전)
          if (!this.isValidForCalculation(coupon, calculateDiscountDto)) {
            continue;
          }

          // 할인 금액 계산
          const discountAmount = this.calculateDiscountAmountForOrder(coupon, calculateDiscountDto);
          
          if (discountAmount > 0) {
            totalDiscountAmount += discountAmount;
            appliedCoupons.push(couponCode);

            // 무료 배송 쿠폰인 경우 배송비 할인
            if (coupon.type === CouponType.FREE_DELIVERY) {
              discountedDeliveryFee = 0;
            }
          }
        } catch (error) {
          // 개별 쿠폰 처리 실패는 무시하고 계속 진행
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          this.logger.warn(`Failed to process coupon ${couponCode}: ${errorMessage}`);
        }
      }

      const finalAmount = Math.max(0, calculateDiscountDto.orderAmount - totalDiscountAmount);

      return {
        originalAmount: calculateDiscountDto.orderAmount,
        totalDiscountAmount,
        finalAmount,
        originalDeliveryFee: calculateDiscountDto.deliveryFee,
        discountedDeliveryFee,
        success: !hasError,
        errorMessage: hasError ? errorMessage : undefined,
        appliedCoupons
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to calculate discount: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 비활성화
   */
  async deactivateCoupon(couponId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('coupons')
        .update({ 
          is_active: false,
          status: CouponStatus.INACTIVE,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId);

      if (error) {
        this.logger.error('Failed to deactivate coupon:', error);
        throw new BadRequestException('쿠폰 비활성화에 실패했습니다.');
      }

      this.logger.log(`Coupon deactivated: ${couponId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to deactivate coupon: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 내부 메서드들
   */

  /**
   * 쿠폰 코드 중복 확인
   */
  private async validateCouponCodeUniqueness(code: string): Promise<void> {
    const { data: existingCoupon } = await this.supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existingCoupon) {
      throw new ConflictException('이미 존재하는 쿠폰 코드입니다.');
    }
  }

  /**
   * 쿠폰 데이터 검증
   */
  private validateCouponData(couponData: CreateCouponDto): void {
    const validFrom = new Date(couponData.validFrom);
    const validUntil = new Date(couponData.validUntil);
    const now = new Date();

    if (validFrom >= validUntil) {
      throw new BadRequestException('유효 종료일은 시작일보다 이후여야 합니다.');
    }

    if (validUntil <= now) {
      throw new BadRequestException('유효 종료일은 현재 시간보다 이후여야 합니다.');
    }

    if (couponData.type === CouponType.PERCENTAGE && couponData.discountValue > 100) {
      throw new BadRequestException('퍼센트 할인은 100%를 초과할 수 없습니다.');
    }
  }

  /**
   * 쿠폰 사용 유효성 검증
   */
  private async validateCouponUsage(
    coupon: CouponResponseDto, 
    applyCouponDto: ApplyCouponDto
  ): Promise<{ isValid: boolean; reason?: string }> {
    // 쿠폰 활성 상태 확인
    if (!coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
      return { isValid: false, reason: '비활성화된 쿠폰입니다.' };
    }

    // 유효 기간 확인
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return { isValid: false, reason: '쿠폰 유효 기간이 아닙니다.' };
    }

    // 사용 횟수 확인
    if (coupon.conditions.maxUsageCount && coupon.totalUsedCount >= coupon.conditions.maxUsageCount) {
      return { isValid: false, reason: '쿠폰 사용 한도에 도달했습니다.' };
    }

    // 고객별 사용 횟수 확인
    if (applyCouponDto.customerId && coupon.conditions.maxUsagePerCustomer) {
      const customerUsageCount = await this.getCustomerCouponUsageCount(coupon.id, applyCouponDto.customerId);
      if (customerUsageCount >= coupon.conditions.maxUsagePerCustomer) {
        return { isValid: false, reason: '고객별 쿠폰 사용 한도에 도달했습니다.' };
      }
    }

    return { isValid: true };
  }

  /**
   * 주문 정보 조회
   */
  private async getOrderInfo(orderId: string): Promise<any> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new NotFoundException('주문 정보를 찾을 수 없습니다.');
    }

    return order;
  }

  /**
   * 할인 금액 계산
   */
  private calculateDiscountAmount(coupon: CouponResponseDto, orderInfo: any): number {
    let discountAmount = 0;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discountAmount = (orderInfo.total_amount * coupon.discountValue) / 100;
        break;
      case CouponType.FIXED_AMOUNT:
        discountAmount = coupon.discountValue;
        break;
      case CouponType.FREE_DELIVERY:
        discountAmount = orderInfo.delivery_fee || 0;
        break;
      default:
        discountAmount = 0;
    }

    // 최대 할인 금액 제한 적용
    if (coupon.conditions.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.conditions.maxDiscountAmount);
    }

    // 주문 금액을 초과할 수 없음
    discountAmount = Math.min(discountAmount, orderInfo.total_amount);

    return Math.max(0, discountAmount);
  }

  /**
   * 할인 계산용 할인 금액 계산
   */
  private calculateDiscountAmountForOrder(coupon: CouponResponseDto, orderData: CalculateDiscountDto): number {
    let discountAmount = 0;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discountAmount = (orderData.orderAmount * coupon.discountValue) / 100;
        break;
      case CouponType.FIXED_AMOUNT:
        discountAmount = coupon.discountValue;
        break;
      case CouponType.FREE_DELIVERY:
        discountAmount = orderData.deliveryFee;
        break;
      default:
        discountAmount = 0;
    }

    // 최대 할인 금액 제한 적용
    if (coupon.conditions.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.conditions.maxDiscountAmount);
    }

    // 최소 주문 금액 확인
    if (coupon.conditions.minOrderAmount && orderData.orderAmount < coupon.conditions.minOrderAmount) {
      return 0;
    }

    return Math.max(0, Math.min(discountAmount, orderData.orderAmount));
  }

  /**
   * 계산용 쿠폰 유효성 검증
   */
  private isValidForCalculation(coupon: CouponResponseDto, orderData: CalculateDiscountDto): boolean {
    // 활성 상태 확인
    if (!coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
      return false;
    }

    // 유효 기간 확인
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return false;
    }

    // 가게 제한 확인
    if (coupon.restaurantId && coupon.restaurantId !== orderData.restaurantId) {
      return false;
    }

    // 적용 가능한 가게 확인
    if (coupon.conditions.applicableRestaurants && 
        coupon.conditions.applicableRestaurants.length > 0 &&
        !coupon.conditions.applicableRestaurants.includes(orderData.restaurantId)) {
      return false;
    }

    return true;
  }

  /**
   * 쿠폰 사용 이력 저장
   */
  private async saveCouponUsage(usageData: {
    couponId: string;
    couponCode: string;
    orderId: string;
    customerId: string;
    discountAmount: number;
    restaurantId: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('coupon_usage')
      .insert({
        coupon_id: usageData.couponId,
        coupon_code: usageData.couponCode,
        order_id: usageData.orderId,
        customer_id: usageData.customerId,
        discount_amount: usageData.discountAmount,
        used_at: new Date().toISOString(),
        restaurant_id: usageData.restaurantId,
        is_cancelled: false
      });

    if (error) {
      this.logger.error('Failed to save coupon usage:', error);
      throw new BadRequestException('쿠폰 사용 이력 저장에 실패했습니다.');
    }
  }

  /**
   * 쿠폰 사용 횟수 업데이트
   */
  private async updateCouponUsageCount(couponId: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('increment_coupon_usage', { coupon_id: couponId });

    if (error) {
      this.logger.error('Failed to update coupon usage count:', error);
    }
  }

  /**
   * 고객별 쿠폰 사용 횟수 조회
   */
  private async getCustomerCouponUsageCount(couponId: string, customerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('coupon_usage')
      .select('id', { count: 'exact' })
      .eq('coupon_id', couponId)
      .eq('customer_id', customerId)
      .eq('is_cancelled', false);

    if (error) {
      this.logger.error('Failed to get customer coupon usage count:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * 쿠폰 엔티티를 응답 DTO로 변환
   */
  private mapCouponEntityToResponseDto(coupon: CouponEntity): CouponResponseDto {
    return {
      id: coupon.id,
      name: coupon.name,
      description: coupon.description,
      code: coupon.code,
      type: coupon.type,
      discountValue: coupon.discount_value,
      target: coupon.target,
      status: coupon.status,
      validFrom: new Date(coupon.valid_from),
      validUntil: new Date(coupon.valid_until),
      conditions: coupon.conditions || {},
      restaurantId: coupon.restaurant_id,
      totalUsedCount: coupon.total_used_count,
      isActive: coupon.is_active,
      autoApply: coupon.auto_apply,
      createdAt: new Date(coupon.created_at),
      updatedAt: new Date(coupon.updated_at)
    };
  }
} 