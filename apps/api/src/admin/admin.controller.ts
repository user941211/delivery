import {
  Controller,
  Get,
  Put,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 인증 가드
// import { RolesGuard } from '../auth/roles.guard'; // 역할 기반 가드
// import { Roles } from '../auth/roles.decorator'; // 역할 데코레이터

/**
 * 관리자 컨트롤러
 * 플랫폼 관리를 위한 관리자 전용 API 엔드포인트를 제공
 */
@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard) // 인증 및 권한 검사
// @Roles('admin') // 관리자만 접근 가능
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 대시보드 개요 통계 조회
   */
  @Get('dashboard')
  @ApiOperation({ 
    summary: '대시보드 개요 통계',
    description: '관리자 대시보드에 표시할 전체 플랫폼 통계를 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '대시보드 통계가 성공적으로 조회되었습니다.',
    schema: {
      example: {
        timestamp: '2024-12-01T10:30:00Z',
        users: {
          total: 1250,
          active: 1180,
          today: 15,
          byRole: {
            customers: 1050,
            drivers: 85,
            restaurant_owners: 115
          }
        },
        restaurants: {
          total: 115,
          verified: 98,
          pending: 17,
          averageRating: 4.2
        },
        orders: {
          total: 3420,
          today: 45,
          thisMonth: 950,
          averageOrderValue: 28500
        },
        revenue: {
          thisMonth: 98500000,
          commission: {
            thisMonth: 2850000
          }
        }
      }
    }
  })
  async getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  /**
   * 사용자 목록 조회
   */
  @Get('users')
  @ApiOperation({ 
    summary: '사용자 목록 조회',
    description: '플랫폼의 모든 사용자 목록을 페이징과 필터를 통해 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수 (기본값: 20)' })
  @ApiQuery({ name: 'role', required: false, description: '사용자 역할 필터 (customer, driver, restaurant_owner, admin)' })
  @ApiQuery({ name: 'status', required: false, description: '사용자 상태 필터 (active, inactive)' })
  @ApiResponse({ 
    status: 200, 
    description: '사용자 목록이 성공적으로 조회되었습니다.' 
  })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('페이지당 항목 수는 1-100 사이여야 합니다.');
    }

    return this.adminService.getUsers(pageNum, limitNum, role, status);
  }

  /**
   * 사용자 상태 변경
   */
  @Put('users/:id/status')
  @ApiOperation({ 
    summary: '사용자 상태 변경',
    description: '특정 사용자의 활성화/비활성화 상태를 변경합니다.'
  })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        is_active: {
          type: 'boolean',
          description: '사용자 활성화 상태'
        }
      },
      required: ['is_active']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '사용자 상태가 성공적으로 변경되었습니다.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '사용자를 찾을 수 없습니다.' 
  })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body('is_active', ParseBoolPipe) isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(userId, isActive);
  }

  /**
   * 레스토랑 목록 조회
   */
  @Get('restaurants')
  @ApiOperation({ 
    summary: '레스토랑 목록 조회',
    description: '플랫폼의 모든 레스토랑 목록을 페이징과 필터를 통해 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수 (기본값: 20)' })
  @ApiQuery({ name: 'status', required: false, description: '레스토랑 상태 필터 (verified, pending, active, inactive)' })
  @ApiResponse({ 
    status: 200, 
    description: '레스토랑 목록이 성공적으로 조회되었습니다.' 
  })
  async getRestaurants(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('페이지당 항목 수는 1-100 사이여야 합니다.');
    }

    return this.adminService.getRestaurants(pageNum, limitNum, status);
  }

  /**
   * 레스토랑 승인/거부
   */
  @Put('restaurants/:id/verification')
  @ApiOperation({ 
    summary: '레스토랑 승인/거부',
    description: '특정 레스토랑의 승인 상태를 변경합니다.'
  })
  @ApiParam({ name: 'id', description: '레스토랑 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        is_verified: {
          type: 'boolean',
          description: '레스토랑 승인 상태'
        }
      },
      required: ['is_verified']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '레스토랑 승인 상태가 성공적으로 변경되었습니다.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '레스토랑을 찾을 수 없습니다.' 
  })
  async updateRestaurantVerification(
    @Param('id') restaurantId: string,
    @Body('is_verified', ParseBoolPipe) isVerified: boolean,
  ) {
    return this.adminService.updateRestaurantVerification(restaurantId, isVerified);
  }

  /**
   * 주문 목록 조회
   */
  @Get('orders')
  @ApiOperation({ 
    summary: '주문 목록 조회',
    description: '플랫폼의 모든 주문 목록을 페이징과 필터를 통해 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수 (기본값: 20)' })
  @ApiQuery({ name: 'status', required: false, description: '주문 상태 필터' })
  @ApiQuery({ name: 'date_from', required: false, description: '조회 시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, description: '조회 종료 날짜 (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: '주문 목록이 성공적으로 조회되었습니다.' 
  })
  async getOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('페이지당 항목 수는 1-100 사이여야 합니다.');
    }

    return this.adminService.getOrders(pageNum, limitNum, status, dateFrom, dateTo);
  }

  /**
   * 리뷰 목록 조회
   */
  @Get('reviews')
  @ApiOperation({ 
    summary: '리뷰 목록 조회',
    description: '플랫폼의 모든 리뷰 목록을 페이징과 필터를 통해 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수 (기본값: 20)' })
  @ApiQuery({ name: 'min_rating', required: false, description: '최소 평점 필터' })
  @ApiQuery({ name: 'max_rating', required: false, description: '최대 평점 필터' })
  @ApiResponse({ 
    status: 200, 
    description: '리뷰 목록이 성공적으로 조회되었습니다.' 
  })
  async getReviews(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('min_rating') minRating?: string,
    @Query('max_rating') maxRating?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const minRatingNum = minRating ? parseFloat(minRating) : undefined;
    const maxRatingNum = maxRating ? parseFloat(maxRating) : undefined;

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('페이지당 항목 수는 1-100 사이여야 합니다.');
    }

    if (minRatingNum !== undefined && (isNaN(minRatingNum) || minRatingNum < 1 || minRatingNum > 5)) {
      throw new BadRequestException('최소 평점은 1-5 사이여야 합니다.');
    }

    if (maxRatingNum !== undefined && (isNaN(maxRatingNum) || maxRatingNum < 1 || maxRatingNum > 5)) {
      throw new BadRequestException('최대 평점은 1-5 사이여야 합니다.');
    }

    return this.adminService.getReviews(pageNum, limitNum, minRatingNum, maxRatingNum);
  }

  /**
   * 리뷰 표시/숨김 처리
   */
  @Put('reviews/:id/visibility')
  @ApiOperation({ 
    summary: '리뷰 표시/숨김 처리',
    description: '특정 리뷰의 공개 여부를 변경합니다.'
  })
  @ApiParam({ name: 'id', description: '리뷰 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        is_visible: {
          type: 'boolean',
          description: '리뷰 공개 여부'
        }
      },
      required: ['is_visible']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '리뷰 공개 여부가 성공적으로 변경되었습니다.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '리뷰를 찾을 수 없습니다.' 
  })
  async updateReviewVisibility(
    @Param('id') reviewId: string,
    @Body('is_visible', ParseBoolPipe) isVisible: boolean,
  ) {
    return this.adminService.updateReviewVisibility(reviewId, isVisible);
  }

  /**
   * 월별 매출 차트 데이터
   */
  @Get('analytics/revenue/:year')
  @ApiOperation({ 
    summary: '월별 매출 차트 데이터',
    description: '지정된 연도의 월별 매출 및 수수료 데이터를 조회합니다.'
  })
  @ApiParam({ name: 'year', description: '조회할 연도' })
  @ApiResponse({ 
    status: 200, 
    description: '월별 매출 데이터가 성공적으로 조회되었습니다.',
    schema: {
      example: [
        {
          month: 1,
          revenue: 8500000,
          commission: 255000,
          orderCount: 320
        },
        {
          month: 2,
          revenue: 9200000,
          commission: 276000,
          orderCount: 350
        }
      ]
    }
  })
  async getMonthlyRevenueChart(@Param('year', ParseIntPipe) year: number) {
    if (year < 2020 || year > new Date().getFullYear() + 1) {
      throw new BadRequestException('유효하지 않은 연도입니다.');
    }

    return this.adminService.getMonthlyRevenueChart(year);
  }

  /**
   * 시스템 활동 로그 조회
   */
  @Get('activity')
  @ApiOperation({ 
    summary: '시스템 활동 로그 조회',
    description: '플랫폼의 최근 활동 내역을 조회합니다.'
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수 (기본값: 50)' })
  @ApiResponse({ 
    status: 200, 
    description: '시스템 활동 로그가 성공적으로 조회되었습니다.',
    schema: {
      example: {
        activities: [
          {
            type: 'order',
            action: '주문 delivered',
            description: '김철수님이 주문을 delivered 상태로 변경했습니다',
            timestamp: '2024-12-01T10:30:00Z',
            entityId: 'order_123'
          },
          {
            type: 'user',
            action: '사용자 가입',
            description: '이영희님이 customer 역할로 가입했습니다',
            timestamp: '2024-12-01T10:25:00Z',
            entityId: 'user_456'
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 250,
          totalPages: 5
        }
      }
    }
  })
  async getSystemActivity(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('페이지당 항목 수는 1-100 사이여야 합니다.');
    }

    return this.adminService.getSystemActivity(pageNum, limitNum);
  }
} 