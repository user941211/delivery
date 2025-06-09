import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReviewResponseDto } from './dto/create-review-response.dto';
import { GetReviewsDto } from './dto/get-reviews.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 인증 가드 (존재한다고 가정)

/**
 * 리뷰 컨트롤러
 * 리뷰 및 평점 시스템의 모든 API 엔드포인트를 관리
 */
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * 새 리뷰 작성
   * 고객이 주문 완료 후 리뷰를 작성
   */
  @Post()
  @ApiOperation({ 
    summary: '리뷰 작성',
    description: '배달 완료된 주문에 대해 리뷰를 작성합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: '리뷰가 성공적으로 생성되었습니다.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청 (이미 리뷰 존재, 유효하지 않은 주문 등)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '배달 완료된 주문을 찾을 수 없습니다.' 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard) // 인증 필요
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: any, // 실제로는 User 인터페이스 사용
  ) {
    // 임시로 사용자 ID를 추출 (실제로는 JWT에서 가져옴)
    const customerId = req.user?.id || req.body.customer_id;
    
    if (!customerId) {
      throw new BadRequestException('사용자 인증이 필요합니다.');
    }

    return this.reviewsService.createReview(createReviewDto, customerId);
  }

  /**
   * 리뷰 목록 조회
   * 다양한 필터와 페이징을 지원
   */
  @Get()
  @ApiOperation({ 
    summary: '리뷰 목록 조회',
    description: '리뷰 목록을 조회합니다. 다양한 필터와 페이징을 지원합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '리뷰 목록이 성공적으로 조회되었습니다.' 
  })
  @ApiQuery({ name: 'restaurant_id', required: false, description: '레스토랑 ID' })
  @ApiQuery({ name: 'customer_id', required: false, description: '고객 ID' })
  @ApiQuery({ name: 'min_rating', required: false, description: '최소 평점 (1-5)' })
  @ApiQuery({ name: 'max_rating', required: false, description: '최대 평점 (1-5)' })
  @ApiQuery({ name: 'sort_by', required: false, description: '정렬 기준' })
  @ApiQuery({ name: 'sort_order', required: false, description: '정렬 순서' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  async getReviews(@Query() query: GetReviewsDto) {
    return this.reviewsService.getReviews(query);
  }

  /**
   * 특정 리뷰 조회
   */
  @Get(':id')
  @ApiOperation({ 
    summary: '리뷰 상세 조회',
    description: '특정 리뷰의 상세 정보를 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '리뷰 상세 정보가 성공적으로 조회되었습니다.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '리뷰를 찾을 수 없습니다.' 
  })
  @ApiParam({ name: 'id', description: '리뷰 ID' })
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  /**
   * 리뷰에 응답 작성
   * 점주나 배달기사가 리뷰에 답변
   */
  @Post('responses')
  @ApiOperation({ 
    summary: '리뷰 응답 작성',
    description: '점주나 배달기사가 리뷰에 답변을 작성합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: '리뷰 응답이 성공적으로 생성되었습니다.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청 (이미 응답 존재 등)' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '리뷰에 응답할 권한이 없습니다.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '리뷰를 찾을 수 없습니다.' 
  })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard) // 인증 필요
  async createReviewResponse(
    @Body() createResponseDto: CreateReviewResponseDto,
    @Request() req: any,
  ) {
    const responderId = req.user?.id || req.body.responder_id;
    
    if (!responderId) {
      throw new BadRequestException('사용자 인증이 필요합니다.');
    }

    return this.reviewsService.createReviewResponse(createResponseDto, responderId);
  }

  /**
   * 리뷰 도움됨 토글
   */
  @Post(':id/helpful')
  @ApiOperation({ 
    summary: '리뷰 도움됨 토글',
    description: '리뷰에 도움됨 표시를 추가하거나 제거합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '도움됨 상태가 성공적으로 변경되었습니다.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청' 
  })
  @ApiParam({ name: 'id', description: '리뷰 ID' })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard) // 인증 필요
  async toggleReviewHelpful(
    @Param('id') reviewId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.body.user_id;
    
    if (!userId) {
      throw new BadRequestException('사용자 인증이 필요합니다.');
    }

    return this.reviewsService.toggleReviewHelpful(reviewId, userId);
  }

  /**
   * 레스토랑 리뷰 통계 조회
   */
  @Get('stats/:restaurantId')
  @ApiOperation({ 
    summary: '레스토랑 리뷰 통계 조회',
    description: '특정 레스토랑의 리뷰 통계를 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '리뷰 통계가 성공적으로 조회되었습니다.' 
  })
  @ApiParam({ name: 'restaurantId', description: '레스토랑 ID' })
  async getReviewStats(@Param('restaurantId') restaurantId: string) {
    return this.reviewsService.getReviewStats(restaurantId);
  }

  /**
   * 내가 작성한 리뷰 조회
   */
  @Get('my/reviews')
  @ApiOperation({ 
    summary: '내가 작성한 리뷰 조회',
    description: '현재 사용자가 작성한 리뷰 목록을 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '내 리뷰 목록이 성공적으로 조회되었습니다.' 
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard) // 인증 필요
  async getMyReviews(
    @Query() query: GetReviewsDto,
    @Request() req: any,
  ) {
    const customerId = req.user?.id || req.body.customer_id;
    
    if (!customerId) {
      throw new BadRequestException('사용자 인증이 필요합니다.');
    }

    // 고객 ID를 쿼리에 추가
    const updatedQuery = { ...query, customer_id: customerId };
    return this.reviewsService.getReviews(updatedQuery);
  }

  /**
   * 레스토랑의 리뷰 조회 (점주용)
   */
  @Get('restaurant/:restaurantId')
  @ApiOperation({ 
    summary: '레스토랑 리뷰 조회',
    description: '특정 레스토랑의 리뷰 목록을 조회합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '레스토랑 리뷰 목록이 성공적으로 조회되었습니다.' 
  })
  @ApiParam({ name: 'restaurantId', description: '레스토랑 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'min_rating', required: false, description: '최소 평점' })
  @ApiQuery({ name: 'sort_by', required: false, description: '정렬 기준' })
  async getRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
    @Query() query: GetReviewsDto,
  ) {
    // 레스토랑 ID를 쿼리에 추가
    const updatedQuery = { ...query, restaurant_id: restaurantId };
    return this.reviewsService.getReviews(updatedQuery);
  }
} 