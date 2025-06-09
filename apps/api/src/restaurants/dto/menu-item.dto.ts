/**
 * 메뉴 아이템 관리 DTO
 * 
 * 메뉴 아이템 생성, 수정, 조회 관련 데이터 전송 객체들을 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  IsArray,
  IsEnum,
  MinLength, 
  MaxLength, 
  Min, 
  Max,
  IsUrl,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 메뉴 아이템 상태 enum
 */
export enum MenuItemStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

/**
 * 메뉴 아이템 생성 DTO
 */
export class CreateMenuItemDto {
  @ApiProperty({
    description: '메뉴 아이템명',
    example: '불고기 덮밥',
    minLength: 1,
    maxLength: 100
  })
  @IsString({ message: '메뉴명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '메뉴명을 입력해주세요.' })
  @MaxLength(100, { message: '메뉴명은 최대 100자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '메뉴 설명',
    example: '부드러운 불고기와 신선한 야채가 어우러진 덮밥',
    maxLength: 500
  })
  @IsString({ message: '메뉴 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '메뉴 설명은 최대 500자까지 가능합니다.' })
  description: string;

  @ApiProperty({
    description: '기본 가격 (원)',
    example: 12000,
    minimum: 0
  })
  @IsNumber({}, { message: '가격은 숫자여야 합니다.' })
  @Min(0, { message: '가격은 0 이상이어야 합니다.' })
  price: number;

  @ApiProperty({
    description: '할인 가격 (원)',
    example: 10000,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '할인 가격은 숫자여야 합니다.' })
  @Min(0, { message: '할인 가격은 0 이상이어야 합니다.' })
  discountPrice?: number;

  @ApiProperty({
    description: '메뉴 카테고리 ID',
    example: 'category-123'
  })
  @IsString({ message: '카테고리 ID는 문자열이어야 합니다.' })
  categoryId: string;

  @ApiProperty({
    description: '메뉴 상태',
    enum: MenuItemStatus,
    example: MenuItemStatus.AVAILABLE,
    default: MenuItemStatus.AVAILABLE
  })
  @IsOptional()
  @IsEnum(MenuItemStatus, { message: '올바른 메뉴 상태를 선택해주세요.' })
  status?: MenuItemStatus;

  @ApiProperty({
    description: '추천 메뉴 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '추천 메뉴 여부는 boolean 값이어야 합니다.' })
  isRecommended?: boolean;

  @ApiProperty({
    description: '인기 메뉴 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '인기 메뉴 여부는 boolean 값이어야 합니다.' })
  isPopular?: boolean;

  @ApiProperty({
    description: '매운맛 정도 (0-5)',
    example: 2,
    minimum: 0,
    maximum: 5,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: '매운맛 정도는 숫자여야 합니다.' })
  @Min(0, { message: '매운맛 정도는 0 이상이어야 합니다.' })
  @Max(5, { message: '매운맛 정도는 5 이하여야 합니다.' })
  spicyLevel?: number;

  @ApiProperty({
    description: '조리 시간 (분)',
    example: 15,
    minimum: 1,
    maximum: 120
  })
  @IsNumber({}, { message: '조리 시간은 숫자여야 합니다.' })
  @Min(1, { message: '조리 시간은 1분 이상이어야 합니다.' })
  @Max(120, { message: '조리 시간은 120분 이하여야 합니다.' })
  preparationTime: number;

  @ApiProperty({
    description: '칼로리 (kcal)',
    example: 650,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '칼로리는 숫자여야 합니다.' })
  @Min(0, { message: '칼로리는 0 이상이어야 합니다.' })
  calories?: number;

  @ApiProperty({
    description: '알레르기 정보',
    example: ['계란', '밀', '대두'],
    isArray: true,
    required: false
  })
  @IsOptional()
  @IsArray({ message: '알레르기 정보는 배열이어야 합니다.' })
  @IsString({ each: true, message: '알레르기 정보는 문자열 배열이어야 합니다.' })
  allergens?: string[];

  @ApiProperty({
    description: '영양 정보',
    example: {
      protein: 25,
      carbohydrate: 45,
      fat: 12,
      sodium: 800
    },
    required: false
  })
  @IsOptional()
  nutritionInfo?: {
    protein?: number;
    carbohydrate?: number;
    fat?: number;
    sodium?: number;
    sugar?: number;
    fiber?: number;
  };

  @ApiProperty({
    description: '정렬 순서',
    example: 1,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  sortOrder?: number;

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
 * 메뉴 아이템 수정 DTO
 */
export class UpdateMenuItemDto {
  @ApiProperty({
    description: '메뉴 아이템명',
    example: '수정된 메뉴명',
    required: false,
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: '메뉴명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '메뉴명을 입력해주세요.' })
  @MaxLength(100, { message: '메뉴명은 최대 100자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '메뉴 설명',
    example: '수정된 메뉴 설명',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '메뉴 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '메뉴 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '기본 가격 (원)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '가격은 숫자여야 합니다.' })
  @Min(0, { message: '가격은 0 이상이어야 합니다.' })
  price?: number;

  @ApiProperty({
    description: '할인 가격 (원)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '할인 가격은 숫자여야 합니다.' })
  @Min(0, { message: '할인 가격은 0 이상이어야 합니다.' })
  discountPrice?: number;

  @ApiProperty({
    description: '메뉴 카테고리 ID',
    required: false
  })
  @IsOptional()
  @IsString({ message: '카테고리 ID는 문자열이어야 합니다.' })
  categoryId?: string;

  @ApiProperty({
    description: '메뉴 상태',
    enum: MenuItemStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(MenuItemStatus, { message: '올바른 메뉴 상태를 선택해주세요.' })
  status?: MenuItemStatus;

  @ApiProperty({
    description: '추천 메뉴 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '추천 메뉴 여부는 boolean 값이어야 합니다.' })
  isRecommended?: boolean;

  @ApiProperty({
    description: '인기 메뉴 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '인기 메뉴 여부는 boolean 값이어야 합니다.' })
  isPopular?: boolean;

  @ApiProperty({
    description: '매운맛 정도 (0-5)',
    required: false,
    minimum: 0,
    maximum: 5
  })
  @IsOptional()
  @IsNumber({}, { message: '매운맛 정도는 숫자여야 합니다.' })
  @Min(0, { message: '매운맛 정도는 0 이상이어야 합니다.' })
  @Max(5, { message: '매운맛 정도는 5 이하여야 합니다.' })
  spicyLevel?: number;

  @ApiProperty({
    description: '조리 시간 (분)',
    required: false,
    minimum: 1,
    maximum: 120
  })
  @IsOptional()
  @IsNumber({}, { message: '조리 시간은 숫자여야 합니다.' })
  @Min(1, { message: '조리 시간은 1분 이상이어야 합니다.' })
  @Max(120, { message: '조리 시간은 120분 이하여야 합니다.' })
  preparationTime?: number;

  @ApiProperty({
    description: '칼로리 (kcal)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '칼로리는 숫자여야 합니다.' })
  @Min(0, { message: '칼로리는 0 이상이어야 합니다.' })
  calories?: number;

  @ApiProperty({
    description: '알레르기 정보',
    isArray: true,
    required: false
  })
  @IsOptional()
  @IsArray({ message: '알레르기 정보는 배열이어야 합니다.' })
  @IsString({ each: true, message: '알레르기 정보는 문자열 배열이어야 합니다.' })
  allergens?: string[];

  @ApiProperty({
    description: '영양 정보',
    required: false
  })
  @IsOptional()
  nutritionInfo?: {
    protein?: number;
    carbohydrate?: number;
    fat?: number;
    sodium?: number;
    sugar?: number;
    fiber?: number;
  };

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
 * 메뉴 아이템 응답 인터페이스
 */
export interface MenuItemResponse {
  id: string;
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  status: MenuItemStatus;
  isRecommended: boolean;
  isPopular: boolean;
  spicyLevel?: number;
  preparationTime: number;
  calories?: number;
  allergens: string[];
  nutritionInfo?: {
    protein?: number;
    carbohydrate?: number;
    fat?: number;
    sodium?: number;
    sugar?: number;
    fiber?: number;
  };
  images: {
    id: string;
    url: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
  }[];
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 메뉴 아이템 목록 조회 필터 DTO
 */
export class MenuItemFilterDto {
  @ApiProperty({
    description: '카테고리 ID로 필터링',
    required: false
  })
  @IsOptional()
  @IsString({ message: '카테고리 ID는 문자열이어야 합니다.' })
  categoryId?: string;

  @ApiProperty({
    description: '메뉴 상태로 필터링',
    enum: MenuItemStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(MenuItemStatus, { message: '올바른 메뉴 상태를 선택해주세요.' })
  status?: MenuItemStatus;

  @ApiProperty({
    description: '추천 메뉴만 조회',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '추천 메뉴 필터는 boolean 값이어야 합니다.' })
  isRecommended?: boolean;

  @ApiProperty({
    description: '인기 메뉴만 조회',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '인기 메뉴 필터는 boolean 값이어야 합니다.' })
  isPopular?: boolean;

  @ApiProperty({
    description: '검색 키워드',
    required: false
  })
  @IsOptional()
  @IsString({ message: '검색 키워드는 문자열이어야 합니다.' })
  search?: string;

  @ApiProperty({
    description: '페이지 번호',
    required: false,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @IsNumber({}, { message: '페이지 번호는 숫자여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @ApiProperty({
    description: '페이지당 아이템 수',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @IsNumber({}, { message: '페이지당 아이템 수는 숫자여야 합니다.' })
  @Min(1, { message: '페이지당 아이템 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 아이템 수는 100 이하여야 합니다.' })
  limit?: number;
} 