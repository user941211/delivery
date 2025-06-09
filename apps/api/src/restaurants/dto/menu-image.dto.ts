/**
 * 메뉴 이미지 관리 DTO
 * 
 * 메뉴 아이템별 이미지 업로드, 수정, 조회 관련 데이터 전송 객체들을 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  IsEnum,
  MinLength, 
  MaxLength, 
  Min,
  Max
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 메뉴 이미지 타입 enum
 */
export enum MenuImageType {
  MAIN = 'main',           // 메인 이미지
  GALLERY = 'gallery',     // 갤러리 이미지
  DETAIL = 'detail',       // 상세 설명 이미지
  INGREDIENT = 'ingredient', // 재료 이미지
}

/**
 * 메뉴 이미지 업로드 DTO
 */
export class UploadMenuImageDto {
  @ApiProperty({
    description: '메뉴 이미지 타입',
    enum: MenuImageType,
    example: MenuImageType.MAIN
  })
  @IsEnum(MenuImageType, { message: '올바른 메뉴 이미지 타입을 선택해주세요.' })
  type: MenuImageType;

  @ApiProperty({
    description: '이미지 설명',
    example: '메뉴의 메인 이미지입니다.',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '이미지 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '이미지 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '대표 이미지 여부',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '대표 이미지 여부는 boolean 값이어야 합니다.' })
  isPrimary?: boolean;

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
    description: 'Alt 텍스트 (접근성)',
    example: '불고기 덮밥 이미지',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Alt 텍스트는 문자열이어야 합니다.' })
  @MaxLength(100, { message: 'Alt 텍스트는 최대 100자까지 가능합니다.' })
  altText?: string;
}

/**
 * 메뉴 이미지 수정 DTO
 */
export class UpdateMenuImageDto {
  @ApiProperty({
    description: '이미지 설명',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '이미지 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '이미지 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '대표 이미지 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '대표 이미지 여부는 boolean 값이어야 합니다.' })
  isPrimary?: boolean;

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
    description: 'Alt 텍스트 (접근성)',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Alt 텍스트는 문자열이어야 합니다.' })
  @MaxLength(100, { message: 'Alt 텍스트는 최대 100자까지 가능합니다.' })
  altText?: string;

  @ApiProperty({
    description: '활성화 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '활성화 여부는 boolean 값이어야 합니다.' })
  isActive?: boolean;
}

/**
 * 메뉴 이미지 순서 변경 DTO
 */
export class ReorderMenuImagesDto {
  @ApiProperty({
    description: '이미지 ID와 정렬 순서 매핑',
    example: { 'image-1': 1, 'image-2': 2, 'image-3': 3 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  imageOrders: Record<string, number>;
}

/**
 * 메뉴 대표 이미지 설정 DTO
 */
export class SetPrimaryMenuImageDto {
  @ApiProperty({
    description: '대표 이미지로 설정할 이미지 ID',
    example: 'image-123'
  })
  @IsString({ message: '이미지 ID는 문자열이어야 합니다.' })
  imageId: string;

  @ApiProperty({
    description: '메뉴 이미지 타입',
    enum: MenuImageType,
    example: MenuImageType.MAIN
  })
  @IsEnum(MenuImageType, { message: '올바른 메뉴 이미지 타입을 선택해주세요.' })
  type: MenuImageType;
}

/**
 * 메뉴 이미지 응답 인터페이스
 */
export interface MenuImageResponse {
  id: string;
  menuItemId: string;
  type: MenuImageType;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
  isActive: boolean;
  fileSize: number;
  mimeType: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 메뉴 이미지 갤러리 응답 인터페이스
 */
export interface MenuImageGalleryResponse {
  main?: MenuImageResponse;
  gallery: MenuImageResponse[];
  detail: MenuImageResponse[];
  ingredient: MenuImageResponse[];
  totalCount: number;
}

/**
 * 메뉴 이미지 업로드 응답 인터페이스
 */
export interface MenuImageUploadResponse {
  success: boolean;
  image?: MenuImageResponse;
  message: string;
  errors?: string[];
} 