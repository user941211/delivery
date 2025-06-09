/**
 * 쿠폰 및 할인 시스템 컨트롤러
 * 
 * 쿠폰 생성, 관리, 적용 및 할인 계산 API를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  ParseUUIDPipe,
  BadRequestException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CouponService } from '../services/coupon.service';

import {
  CreateCouponDto,
  CouponResponseDto,
  ApplyCouponDto,
  CalculateDiscountDto,
  DiscountCalculationResultDto,
  CouponType,
  CouponStatus
} from '../dto/coupon.dto';

/**
 * 임시 인증 요청 인터페이스 (실제로는 JWT에서 추출)
 */
interface AuthenticatedRequest {
  user: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * 쿠폰 및 할인 시스템 컨트롤러 클래스
 */
@ApiTags('Coupons')
@Controller('coupons')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class CouponController {
  private readonly logger = new Logger(CouponController.name);

  constructor(
    private readonly couponService: CouponService
  ) {}

  /**
   * 쿠폰 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '쿠폰 생성' })
  @ApiResponse({
    status: 201,
    description: '쿠폰이 성공적으로 생성되었습니다.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 409, description: '중복된 쿠폰 코드입니다.' })
  async createCoupon(
    @Body() createCouponDto: CreateCouponDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<CouponResponseDto> {
    try {
      this.logger.log(`Creating coupon: ${createCouponDto.code}`);
      return await this.couponService.createCoupon(createCouponDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create coupon: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 쿠폰 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '쿠폰 목록 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'type', description: '쿠폰 타입', enum: CouponType, required: false })
  @ApiQuery({ name: 'status', description: '쿠폰 상태', enum: CouponStatus, required: false })
  @ApiQuery({ name: 'restaurantId', description: '가게 ID', required: false })
  @ApiQuery({ name: 'isActive', description: '활성 상태', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: '쿠폰 목록이 성공적으로 조회되었습니다.',
  })
  async getCoupons(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: CouponType,
    @Query('status') status?: CouponStatus,
    @Query('restaurantId') restaurantId?: string,
    @Query('isActive') isActive?: boolean
  ): Promise<{ coupons: CouponResponseDto[]; total: number; page: number; limit: number }> {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;

    const result = await this.couponService.getCoupons({
      page: pageNum,
      limit: limitNum,
      type,
      status,
      restaurantId,
      isActive
    });

    return {
      ...result,
      page: pageNum,
      limit: limitNum
    };
  }

  /**
   * 쿠폰 코드로 조회
   */
  @Get('code/:couponCode')
  @ApiOperation({ summary: '쿠폰 코드로 조회' })
  @ApiParam({ name: 'couponCode', description: '쿠폰 코드' })
  @ApiResponse({
    status: 200,
    description: '쿠폰 정보가 성공적으로 조회되었습니다.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 404, description: '유효하지 않은 쿠폰 코드입니다.' })
  async getCouponByCode(
    @Param('couponCode') couponCode: string
  ): Promise<CouponResponseDto> {
    return await this.couponService.getCouponByCode(couponCode);
  }

  /**
   * 사용 가능한 쿠폰 조회 (고객용)
   */
  @Get('available/:restaurantId')
  @ApiOperation({ summary: '사용 가능한 쿠폰 조회' })
  @ApiParam({ name: 'restaurantId', description: '가게 ID' })
  @ApiQuery({ name: 'orderAmount', description: '주문 금액', required: false })
  @ApiResponse({
    status: 200,
    description: '사용 가능한 쿠폰 목록이 성공적으로 조회되었습니다.',
  })
  async getAvailableCoupons(
    @Param('restaurantId') restaurantId: string,
    @Query('orderAmount') orderAmount?: number,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ coupons: CouponResponseDto[] }> {
    // 활성화된 쿠폰 중에서 해당 가게에서 사용 가능한 쿠폰 조회
    const { coupons } = await this.couponService.getCoupons({
      isActive: true,
      status: CouponStatus.ACTIVE
    });

    const now = new Date();
    const availableCoupons = coupons.filter(coupon => {
      // 유효 기간 확인
      if (now < coupon.validFrom || now > coupon.validUntil) {
        return false;
      }

      // 가게 제한 확인
      if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
        return false;
      }

      // 적용 가능한 가게 확인
      if (coupon.conditions.applicableRestaurants && 
          coupon.conditions.applicableRestaurants.length > 0 &&
          !coupon.conditions.applicableRestaurants.includes(restaurantId)) {
        return false;
      }

      // 최소 주문 금액 확인
      if (orderAmount && coupon.conditions.minOrderAmount && orderAmount < coupon.conditions.minOrderAmount) {
        return false;
      }

      // 사용 횟수 확인
      if (coupon.conditions.maxUsageCount && coupon.totalUsedCount >= coupon.conditions.maxUsageCount) {
        return false;
      }

      return true;
    });

    return { coupons: availableCoupons };
  }

  /**
   * 자동 적용 쿠폰 조회
   */
  @Get('auto-apply/:restaurantId')
  @ApiOperation({ summary: '자동 적용 쿠폰 조회' })
  @ApiParam({ name: 'restaurantId', description: '가게 ID' })
  @ApiQuery({ name: 'orderAmount', description: '주문 금액' })
  @ApiResponse({
    status: 200,
    description: '자동 적용 쿠폰이 성공적으로 조회되었습니다.',
  })
  async getAutoApplyCoupons(
    @Param('restaurantId') restaurantId: string,
    @Query('orderAmount') orderAmount?: number,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ coupons: CouponResponseDto[] }> {
    if (!orderAmount) {
      throw new BadRequestException('주문 금액은 필수입니다.');
    }

    // 자동 적용 쿠폰 중에서 사용 가능한 쿠폰 조회
    const { coupons } = await this.couponService.getCoupons({
      isActive: true,
      status: CouponStatus.ACTIVE
    });

    const now = new Date();
    const autoApplyCoupons = coupons.filter(coupon => {
      // 자동 적용 설정 확인
      if (!coupon.autoApply) {
        return false;
      }

      // 유효 기간 확인
      if (now < coupon.validFrom || now > coupon.validUntil) {
        return false;
      }

      // 가게 제한 확인
      if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
        return false;
      }

      // 최소 주문 금액 확인
      if (coupon.conditions.minOrderAmount && orderAmount < coupon.conditions.minOrderAmount) {
        return false;
      }

      // 사용 횟수 확인
      if (coupon.conditions.maxUsageCount && coupon.totalUsedCount >= coupon.conditions.maxUsageCount) {
        return false;
      }

      return true;
    });

    return { coupons: autoApplyCoupons };
  }

  /**
   * 쿠폰 통계 조회
   */
  @Get('stats/overview')
  @ApiOperation({ summary: '쿠폰 통계 조회' })
  @ApiQuery({ name: 'restaurantId', description: '가게 ID (선택)', required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiResponse({
    status: 200,
    description: '쿠폰 통계가 성공적으로 조회되었습니다.',
  })
  async getCouponStats(
    @Query('restaurantId') restaurantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    usedCoupons: number;
    totalDiscountAmount: number;
    topCoupons: Array<{ code: string; name: string; usageCount: number }>;
  }> {
    const { coupons, total } = await this.couponService.getCoupons({
      restaurantId,
      limit: 1000 // 통계를 위해 큰 값으로 설정
    });

    const activeCoupons = coupons.filter(coupon => 
      coupon.isActive && coupon.status === CouponStatus.ACTIVE
    ).length;

    const usedCoupons = coupons.filter(coupon => 
      coupon.totalUsedCount > 0
    ).length;

    // 상위 쿠폰 정렬
    const topCoupons = coupons
      .filter(coupon => coupon.totalUsedCount > 0)
      .sort((a, b) => b.totalUsedCount - a.totalUsedCount)
      .slice(0, 5)
      .map(coupon => ({
        code: coupon.code,
        name: coupon.name,
        usageCount: coupon.totalUsedCount
      }));

    return {
      totalCoupons: total,
      activeCoupons,
      usedCoupons,
      totalDiscountAmount: 0, // 실제로는 쿠폰 사용 이력에서 계산해야 함
      topCoupons
    };
  }

  /**
   * 쿠폰 상세 조회
   */
  @Get(':couponId')
  @ApiOperation({ summary: '쿠폰 상세 조회' })
  @ApiParam({ name: 'couponId', description: '쿠폰 ID' })
  @ApiResponse({
    status: 200,
    description: '쿠폰 정보가 성공적으로 조회되었습니다.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없습니다.' })
  async getCouponById(
    @Param('couponId', ParseUUIDPipe) couponId: string
  ): Promise<CouponResponseDto> {
    return await this.couponService.getCouponById(couponId);
  }

  /**
   * 쿠폰 적용
   */
  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '쿠폰 적용' })
  @ApiResponse({
    status: 200,
    description: '쿠폰이 성공적으로 적용되었습니다.',
  })
  @ApiResponse({ status: 400, description: '쿠폰 적용에 실패했습니다.' })
  @ApiResponse({ status: 404, description: '유효하지 않은 쿠폰 코드입니다.' })
  async applyCoupon(
    @Body() applyCouponDto: ApplyCouponDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; discountAmount: number; message?: string }> {
    // 인증된 사용자 정보가 있으면 고객 ID로 사용
    const enrichedRequest = {
      ...applyCouponDto,
      customerId: applyCouponDto.customerId || req?.user?.id
    };

    return await this.couponService.applyCoupon(enrichedRequest);
  }

  /**
   * 할인 계산
   */
  @Post('calculate-discount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '할인 계산' })
  @ApiResponse({
    status: 200,
    description: '할인이 성공적으로 계산되었습니다.',
    type: DiscountCalculationResultDto,
  })
  @ApiResponse({ status: 400, description: '할인 계산에 실패했습니다.' })
  async calculateDiscount(
    @Body() calculateDiscountDto: CalculateDiscountDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<DiscountCalculationResultDto> {
    // 인증된 사용자 정보가 있으면 고객 ID로 사용
    const enrichedRequest = {
      ...calculateDiscountDto,
      customerId: calculateDiscountDto.customerId || req?.user?.id
    };

    return await this.couponService.calculateDiscount(enrichedRequest);
  }

  /**
   * 쿠폰 유효성 검증
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '쿠폰 유효성 검증' })
  @ApiResponse({
    status: 200,
    description: '쿠폰 유효성이 성공적으로 검증되었습니다.',
  })
  async validateCoupon(
    @Body() body: { couponCode: string; restaurantId?: string; orderAmount?: number }
  ): Promise<{ isValid: boolean; message?: string; coupon?: CouponResponseDto }> {
    try {
      const coupon = await this.couponService.getCouponByCode(body.couponCode);
      
      // 기본적인 유효성 검증
      const now = new Date();
      
      if (!coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
        return {
          isValid: false,
          message: '비활성화된 쿠폰입니다.'
        };
      }

      if (now < coupon.validFrom || now > coupon.validUntil) {
        return {
          isValid: false,
          message: '쿠폰 유효 기간이 아닙니다.'
        };
      }

      // 가게 제한 확인
      if (body.restaurantId && coupon.restaurantId && coupon.restaurantId !== body.restaurantId) {
        return {
          isValid: false,
          message: '해당 가게에서 사용할 수 없는 쿠폰입니다.'
        };
      }

      // 최소 주문 금액 확인
      if (body.orderAmount && coupon.conditions.minOrderAmount && body.orderAmount < coupon.conditions.minOrderAmount) {
        return {
          isValid: false,
          message: `최소 주문 금액 ${coupon.conditions.minOrderAmount}원 이상이어야 합니다.`
        };
      }

      return {
        isValid: true,
        message: '유효한 쿠폰입니다.',
        coupon
      };
    } catch (error) {
      return {
        isValid: false,
        message: '유효하지 않은 쿠폰 코드입니다.'
      };
    }
  }

  /**
   * 쿠폰 비활성화
   */
  @Put(':couponId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '쿠폰 비활성화' })
  @ApiParam({ name: 'couponId', description: '쿠폰 ID' })
  @ApiResponse({
    status: 200,
    description: '쿠폰이 성공적으로 비활성화되었습니다.',
  })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없습니다.' })
  async deactivateCoupon(
    @Param('couponId', ParseUUIDPipe) couponId: string
  ): Promise<{ message: string }> {
    await this.couponService.deactivateCoupon(couponId);
    return { message: '쿠폰이 성공적으로 비활성화되었습니다.' };
  }
} 