import { IsNumber, IsString, IsOptional, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 리뷰 생성 DTO
 * 고객이 주문 완료 후 작성하는 리뷰 데이터
 */
export class CreateReviewDto {
  @ApiProperty({
    description: '주문 ID',
    example: 'order_123'
  })
  @IsString()
  order_id: string;

  @ApiProperty({
    description: '레스토랑 평점 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  restaurant_rating: number;

  @ApiPropertyOptional({
    description: '배달 평점 (1-5, 배달이 있는 경우)',
    minimum: 1,
    maximum: 5,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  delivery_rating?: number;

  @ApiProperty({
    description: '음식 평점 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  food_rating: number;

  @ApiProperty({
    description: '서비스 평점 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  service_rating: number;

  @ApiPropertyOptional({
    description: '리뷰 코멘트',
    example: '음식이 맛있었고 배달도 빨랐습니다.'
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: '리뷰 이미지 URL 배열',
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: '익명 리뷰 여부',
    default: false,
    example: false
  })
  @IsOptional()
  @IsBoolean()
  is_anonymous?: boolean;
} 