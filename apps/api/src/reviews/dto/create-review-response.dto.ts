import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 리뷰 응답 생성 DTO
 * 점주나 배달기사가 리뷰에 답변하는 데이터
 */
export class CreateReviewResponseDto {
  @ApiProperty({
    description: '리뷰 ID',
    example: 'review_123'
  })
  @IsString()
  review_id: string;

  @ApiProperty({
    description: '응답자 타입',
    enum: ['restaurant_owner', 'driver'],
    example: 'restaurant_owner'
  })
  @IsEnum(['restaurant_owner', 'driver'])
  responder_type: 'restaurant_owner' | 'driver';

  @ApiProperty({
    description: '응답 내용',
    example: '좋은 리뷰 감사합니다. 앞으로도 더 좋은 서비스를 제공하겠습니다.'
  })
  @IsString()
  response_text: string;
} 