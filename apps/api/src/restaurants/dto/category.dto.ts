/**
 * 레스토랑 카테고리 관리 DTO
 * 
 * 레스토랑 카테고리 및 메뉴 카테고리 관련 데이터 전송 객체들을 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  MinLength, 
  MaxLength, 
  Min, 
  Max,
  IsUrl
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 메뉴 카테고리 생성 DTO
 */
export class CreateMenuCategoryDto {
  @ApiProperty({
    description: '카테고리명',
    example: '메인 메뉴',
    minLength: 1,
    maxLength: 30
  })
  @IsString({ message: '카테고리명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '카테고리명을 입력해주세요.' })
  @MaxLength(30, { message: '카테고리명은 최대 30자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '카테고리 설명',
    example: '메인 요리 메뉴들입니다.',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '카테고리 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '카테고리 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '정렬 순서',
    example: 1,
    minimum: 0
  })
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  sortOrder: number;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: '활성화 여부는 boolean 값이어야 합니다.' })
  isActive?: boolean;
}

/**
 * 메뉴 카테고리 수정 DTO
 */
export class UpdateMenuCategoryDto {
  @ApiProperty({
    description: '카테고리명',
    example: '수정된 카테고리명',
    required: false,
    minLength: 1,
    maxLength: 30
  })
  @IsOptional()
  @IsString({ message: '카테고리명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '카테고리명을 입력해주세요.' })
  @MaxLength(30, { message: '카테고리명은 최대 30자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '카테고리 설명',
    example: '수정된 카테고리 설명',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '카테고리 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '카테고리 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '정렬 순서',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  sortOrder?: number;

  @ApiProperty({
    description: '활성화 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '활성화 여부는 boolean 값이어야 합니다.' })
  isActive?: boolean;
}

/**
 * 카테고리 순서 변경 DTO
 */
export class ReorderCategoriesDto {
  @ApiProperty({
    description: '카테고리 ID와 정렬 순서 매핑',
    example: { 'category-1': 1, 'category-2': 2, 'category-3': 3 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  categoryOrders: Record<string, number>;
}

/**
 * 메뉴 카테고리 응답 인터페이스
 */
export interface MenuCategoryResponse {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  menuItemCount: number;
  createdAt: Date;
  updatedAt: Date;
} 