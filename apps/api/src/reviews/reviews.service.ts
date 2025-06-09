import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createSupabaseServerClient, Tables, TablesInsert, TablesUpdate } from '../../../../packages/database/src/supabase';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReviewResponseDto } from './dto/create-review-response.dto';
import { GetReviewsDto } from './dto/get-reviews.dto';

/**
 * 리뷰 서비스
 * 리뷰 및 평점 시스템의 핵심 비즈니스 로직을 담당
 */
@Injectable()
export class ReviewsService {
  private readonly supabase = createSupabaseServerClient();

  /**
   * 새 리뷰 생성
   * 고객이 주문 완료 후 리뷰를 작성
   */
  async createReview(createReviewDto: CreateReviewDto, customerId: string) {
    // 주문 존재 여부 및 권한 확인
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', createReviewDto.order_id)
      .eq('customer_id', customerId)
      .eq('status', 'delivered')
      .single();

    if (orderError || !order) {
      throw new NotFoundException('배달 완료된 주문을 찾을 수 없습니다.');
    }

    // 이미 리뷰가 존재하는지 확인
    const { data: existingReview } = await this.supabase
      .from('reviews')
      .select('id')
      .eq('order_id', createReviewDto.order_id)
      .single();

    if (existingReview) {
      throw new BadRequestException('이 주문에 대한 리뷰가 이미 존재합니다.');
    }

    // 전체 평점 계산
    const ratingSum = createReviewDto.restaurant_rating + 
                     createReviewDto.food_rating + 
                     createReviewDto.service_rating + 
                     (createReviewDto.delivery_rating || 0);
    const ratingCount = createReviewDto.delivery_rating ? 4 : 3;
    const overall_rating = Number((ratingSum / ratingCount).toFixed(1));

    // 리뷰 데이터 준비
    const reviewData: TablesInsert<'reviews'> = {
      ...createReviewDto,
      customer_id: customerId,
      restaurant_id: order.restaurant_id,
      driver_id: order.driver_id,
      overall_rating,
      is_anonymous: createReviewDto.is_anonymous || false,
      is_visible: true,
      helpful_count: 0,
    };

    // 트랜잭션으로 리뷰 생성 및 레스토랑 평점 업데이트
    const { data: review, error: reviewError } = await this.supabase
      .from('reviews')
      .insert(reviewData)
      .select(`
        *,
        customer:users!customer_id(id, full_name, avatar_url),
        restaurant:restaurants!restaurant_id(id, name),
        driver:users!driver_id(id, full_name, avatar_url)
      `)
      .single();

    if (reviewError) {
      throw new BadRequestException('리뷰 생성에 실패했습니다.');
    }

    // 레스토랑 평점 업데이트
    await this.updateRestaurantRating(order.restaurant_id);

    return review;
  }

  /**
   * 리뷰 목록 조회
   * 다양한 필터와 페이징을 지원
   */
  async getReviews(query: GetReviewsDto) {
    let supabaseQuery = this.supabase
      .from('reviews')
      .select(`
        *,
        customer:users!customer_id(id, full_name, avatar_url),
        restaurant:restaurants!restaurant_id(id, name),
        driver:users!driver_id(id, full_name, avatar_url),
        responses:review_responses(*)
      `, { count: 'exact' })
      .eq('is_visible', true);

    // 필터 적용
    if (query.restaurant_id) {
      supabaseQuery = supabaseQuery.eq('restaurant_id', query.restaurant_id);
    }

    if (query.customer_id) {
      supabaseQuery = supabaseQuery.eq('customer_id', query.customer_id);
    }

    if (query.order_id) {
      supabaseQuery = supabaseQuery.eq('order_id', query.order_id);
    }

    if (query.min_rating) {
      supabaseQuery = supabaseQuery.gte('overall_rating', query.min_rating);
    }

    if (query.max_rating) {
      supabaseQuery = supabaseQuery.lte('overall_rating', query.max_rating);
    }

    if (query.with_images) {
      supabaseQuery = supabaseQuery.not('images', 'is', null);
    }

    if (query.with_comments) {
      supabaseQuery = supabaseQuery.not('comment', 'is', null);
    }

    // 정렬
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order === 'asc' ? true : false;
    supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder });

    // 페이징
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data: reviews, error, count } = await supabaseQuery;

    if (error) {
      throw new BadRequestException('리뷰 조회에 실패했습니다.');
    }

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * 특정 리뷰 조회
   */
  async getReviewById(reviewId: string) {
    const { data: review, error } = await this.supabase
      .from('reviews')
      .select(`
        *,
        customer:users!customer_id(id, full_name, avatar_url),
        restaurant:restaurants!restaurant_id(id, name),
        driver:users!driver_id(id, full_name, avatar_url),
        responses:review_responses(
          *,
          responder:users!responder_id(id, full_name, avatar_url)
        )
      `)
      .eq('id', reviewId)
      .eq('is_visible', true)
      .single();

    if (error || !review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    return review;
  }

  /**
   * 리뷰 응답 생성
   * 점주나 배달기사가 리뷰에 답변
   */
  async createReviewResponse(createResponseDto: CreateReviewResponseDto, responderId: string) {
    // 리뷰 존재 확인
    const { data: review, error: reviewError } = await this.supabase
      .from('reviews')
      .select('restaurant_id, driver_id')
      .eq('id', createResponseDto.review_id)
      .single();

    if (reviewError || !review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    // 권한 확인
    const isRestaurantOwner = createResponseDto.responder_type === 'restaurant_owner';
    const isDriver = createResponseDto.responder_type === 'driver';

    if (isRestaurantOwner) {
      // 점주인 경우 해당 레스토랑의 소유자인지 확인
      const { data: restaurant } = await this.supabase
        .from('restaurants')
        .select('owner_id')
        .eq('id', review.restaurant_id)
        .single();

      if (!restaurant || restaurant.owner_id !== responderId) {
        throw new ForbiddenException('이 리뷰에 응답할 권한이 없습니다.');
      }
    } else if (isDriver) {
      // 배달기사인 경우 해당 주문의 배달기사인지 확인
      if (review.driver_id !== responderId) {
        throw new ForbiddenException('이 리뷰에 응답할 권한이 없습니다.');
      }
    }

    // 이미 응답이 존재하는지 확인
    const { data: existingResponse } = await this.supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', createResponseDto.review_id)
      .eq('responder_id', responderId)
      .eq('responder_type', createResponseDto.responder_type)
      .single();

    if (existingResponse) {
      throw new BadRequestException('이미 응답을 작성했습니다.');
    }

    // 응답 생성
    const { data: response, error: responseError } = await this.supabase
      .from('review_responses')
      .insert({
        ...createResponseDto,
        responder_id: responderId,
      })
      .select(`
        *,
        responder:users!responder_id(id, full_name, avatar_url)
      `)
      .single();

    if (responseError) {
      throw new BadRequestException('리뷰 응답 생성에 실패했습니다.');
    }

    return response;
  }

  /**
   * 리뷰 도움됨 토글
   */
  async toggleReviewHelpful(reviewId: string, userId: string) {
    // 기존 도움됨 여부 확인
    const { data: existing } = await this.supabase
      .from('review_helpful')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // 이미 표시했다면 제거
      const { error } = await this.supabase
        .from('review_helpful')
        .delete()
        .eq('id', existing.id);

      if (error) {
        throw new BadRequestException('도움됨 제거에 실패했습니다.');
      }

      // 리뷰의 helpful_count 감소
      await this.updateReviewHelpfulCount(reviewId, -1);
      
      return { helpful: false };
    } else {
      // 새로 추가
      const { error } = await this.supabase
        .from('review_helpful')
        .insert({ review_id: reviewId, user_id: userId });

      if (error) {
        throw new BadRequestException('도움됨 추가에 실패했습니다.');
      }

      // 리뷰의 helpful_count 증가
      await this.updateReviewHelpfulCount(reviewId, 1);
      
      return { helpful: true };
    }
  }

  /**
   * 리뷰 통계 조회
   */
  async getReviewStats(restaurantId: string) {
    const { data: stats, error } = await this.supabase
      .from('reviews')
      .select('overall_rating, restaurant_rating, food_rating, service_rating, delivery_rating')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true);

    if (error) {
      throw new BadRequestException('리뷰 통계 조회에 실패했습니다.');
    }

    if (!stats.length) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        category_averages: {
          restaurant: 0,
          food: 0,
          service: 0,
          delivery: 0,
        },
      };
    }

    // 평점 분포 계산
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach(review => {
      const rating = Math.round(review.overall_rating);
      ratingDistribution[rating as keyof typeof ratingDistribution]++;
    });

    // 카테고리별 평균 계산
    const categoryAverages = {
      restaurant: stats.reduce((sum, r) => sum + r.restaurant_rating, 0) / stats.length,
      food: stats.reduce((sum, r) => sum + r.food_rating, 0) / stats.length,
      service: stats.reduce((sum, r) => sum + r.service_rating, 0) / stats.length,
      delivery: stats.filter(r => r.delivery_rating).reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / 
                stats.filter(r => r.delivery_rating).length || 0,
    };

    return {
      total_reviews: stats.length,
      average_rating: Number((stats.reduce((sum, r) => sum + r.overall_rating, 0) / stats.length).toFixed(1)),
      rating_distribution: ratingDistribution,
      category_averages: {
        restaurant: Number(categoryAverages.restaurant.toFixed(1)),
        food: Number(categoryAverages.food.toFixed(1)),
        service: Number(categoryAverages.service.toFixed(1)),
        delivery: Number(categoryAverages.delivery.toFixed(1)),
      },
    };
  }

  /**
   * 레스토랑 평점 업데이트
   * 새 리뷰가 추가될 때마다 호출
   */
  private async updateRestaurantRating(restaurantId: string) {
    const { data: reviews } = await this.supabase
      .from('reviews')
      .select('overall_rating')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true);

    if (!reviews?.length) return;

    const averageRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;
    const reviewCount = reviews.length;

    await this.supabase
      .from('restaurants')
      .update({
        rating: Number(averageRating.toFixed(1)),
        review_count: reviewCount,
      })
      .eq('id', restaurantId);
  }

  /**
   * 리뷰 도움됨 카운트 업데이트
   */
  private async updateReviewHelpfulCount(reviewId: string, increment: number) {
    const { data: review } = await this.supabase
      .from('reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single();

    if (review) {
      await this.supabase
        .from('reviews')
        .update({ helpful_count: Math.max(0, review.helpful_count + increment) })
        .eq('id', reviewId);
    }
  }
} 