/**
 * 레스토랑 이미지 관리 DTO
 * 
 * 레스토랑 이미지 업로드, 관리 관련 데이터 전송 객체들을 정의합니다.
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
  IsUrl
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 이미지 타입 enum
 */
export enum ImageType {
  THUMBNAIL = 'thumbnail',
  GALLERY = 'gallery',
  LOGO = 'logo',
  MENU = 'menu',
  INTERIOR = 'interior',
  EXTERIOR = 'exterior',
}

/**
 * 이미지 업로드 DTO
 */
export class UploadImageDto {
  @ApiProperty({
    description: '이미지 타입',
    enum: ImageType,
    example: ImageType.GALLERY
  })
  @IsEnum(ImageType, { message: '올바른 이미지 타입을 선택해주세요.' })
  type: ImageType;

  @ApiProperty({
    description: '이미지 설명',
    example: '레스토랑 내부 전경',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '이미지 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '이미지 설명은 최대 200자까지 가능합니다.' })
  description?: string;

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
    description: '대표 이미지 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '대표 이미지 여부는 boolean 값이어야 합니다.' })
  isPrimary?: boolean;
}

/**
 * 이미지 정보 수정 DTO
 */
export class UpdateImageDto {
  @ApiProperty({
    description: '이미지 설명',
    example: '수정된 이미지 설명',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '이미지 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '이미지 설명은 최대 200자까지 가능합니다.' })
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
    description: '대표 이미지 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '대표 이미지 여부는 boolean 값이어야 합니다.' })
  isPrimary?: boolean;

  @ApiProperty({
    description: '활성화 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '활성화 여부는 boolean 값이어야 합니다.' })
  isActive?: boolean;
}

/**
 * 이미지 순서 변경 DTO
 */
export class ReorderImagesDto {
  @ApiProperty({
    description: '이미지 ID와 정렬 순서 매핑',
    example: { 'image-1': 1, 'image-2': 2, 'image-3': 3 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  imageOrders: Record<string, number>;
}

/**
 * 대표 이미지 설정 DTO
 */
export class SetPrimaryImageDto {
  @ApiProperty({
    description: '대표 이미지로 설정할 이미지 ID',
    example: 'image-123'
  })
  @IsString({ message: '이미지 ID는 문자열이어야 합니다.' })
  imageId: string;
}

/**
 * 이미지 응답 인터페이스
 */
export interface ImageResponse {
  id: string;
  restaurantId: string;
  type: ImageType;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 이미지 갤러리 응답 인터페이스
 */
export interface ImageGalleryResponse {
  thumbnail?: ImageResponse;
  logo?: ImageResponse;
  gallery: ImageResponse[];
  menu: ImageResponse[];
  interior: ImageResponse[];
  exterior: ImageResponse[];
  totalCount: number;
}

/**
 * 이미지 업로드 응답 인터페이스
 */
export interface ImageUploadResponse {
  success: boolean;
  image?: ImageResponse;
  message: string;
  errors?: string[];
} 