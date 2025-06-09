import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 리뷰 조회 쿼리 DTO
 * 리뷰 목록을 조회할 때 사용하는 필터 및 페이징 옵션
 */
export class GetReviewsDto {
  @ApiPropertyOptional({
    description: '레스토랑 ID로 필터링',
    example: 'restaurant_123'
  })
  @IsOptional()
  @IsString()
  restaurant_id?: string;

  @ApiPropertyOptional({
    description: '고객 ID로 필터링',
    example: 'user_123'
  })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({
    description: '주문 ID로 필터링',
    example: 'order_123'
  })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({
    description: '최소 평점 필터 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 3
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  min_rating?: number;

  @ApiPropertyOptional({
    description: '최대 평점 필터 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  max_rating?: number;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['created_at', 'overall_rating', 'helpful_count'],
    default: 'created_at',
    example: 'created_at'
  })
  @IsOptional()
  @IsEnum(['created_at', 'overall_rating', 'helpful_count'])
  sort_by?: 'created_at' | 'overall_rating' | 'helpful_count';

  @ApiPropertyOptional({
    description: '정렬 순서',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '이미지가 있는 리뷰만 조회',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  with_images?: boolean;

  @ApiPropertyOptional({
    description: '코멘트가 있는 리뷰만 조회',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  with_comments?: boolean;
} 