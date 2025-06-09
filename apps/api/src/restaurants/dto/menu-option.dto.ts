/**
 * 메뉴 옵션 관리 DTO
 * 
 * 메뉴 옵션 그룹과 개별 옵션 생성, 수정, 조회 관련 데이터 전송 객체들을 정의합니다.
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
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 옵션 그룹 타입 enum
 */
export enum OptionGroupType {
  SINGLE = 'single',     // 단일 선택 (라디오 버튼)
  MULTIPLE = 'multiple', // 다중 선택 (체크박스)
}

/**
 * 옵션 그룹 생성 DTO
 */
export class CreateOptionGroupDto {
  @ApiProperty({
    description: '옵션 그룹명',
    example: '맵기 정도',
    minLength: 1,
    maxLength: 50
  })
  @IsString({ message: '옵션 그룹명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '옵션 그룹명을 입력해주세요.' })
  @MaxLength(50, { message: '옵션 그룹명은 최대 50자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '옵션 그룹 설명',
    example: '메뉴의 맵기 정도를 선택해주세요.',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '옵션 그룹 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '옵션 그룹 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '옵션 그룹 타입',
    enum: OptionGroupType,
    example: OptionGroupType.SINGLE
  })
  @IsEnum(OptionGroupType, { message: '올바른 옵션 그룹 타입을 선택해주세요.' })
  type: OptionGroupType;

  @ApiProperty({
    description: '필수 선택 여부',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '필수 선택 여부는 boolean 값이어야 합니다.' })
  isRequired?: boolean;

  @ApiProperty({
    description: '다중 선택 시 최소 선택 개수',
    example: 0,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '최소 선택 개수는 숫자여야 합니다.' })
  @Min(0, { message: '최소 선택 개수는 0 이상이어야 합니다.' })
  minSelections?: number;

  @ApiProperty({
    description: '다중 선택 시 최대 선택 개수',
    example: 3,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @IsNumber({}, { message: '최대 선택 개수는 숫자여야 합니다.' })
  @Min(1, { message: '최대 선택 개수는 1 이상이어야 합니다.' })
  maxSelections?: number;

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
 * 옵션 그룹 수정 DTO
 */
export class UpdateOptionGroupDto {
  @ApiProperty({
    description: '옵션 그룹명',
    required: false,
    minLength: 1,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '옵션 그룹명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '옵션 그룹명을 입력해주세요.' })
  @MaxLength(50, { message: '옵션 그룹명은 최대 50자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '옵션 그룹 설명',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '옵션 그룹 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '옵션 그룹 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '옵션 그룹 타입',
    enum: OptionGroupType,
    required: false
  })
  @IsOptional()
  @IsEnum(OptionGroupType, { message: '올바른 옵션 그룹 타입을 선택해주세요.' })
  type?: OptionGroupType;

  @ApiProperty({
    description: '필수 선택 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '필수 선택 여부는 boolean 값이어야 합니다.' })
  isRequired?: boolean;

  @ApiProperty({
    description: '다중 선택 시 최소 선택 개수',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '최소 선택 개수는 숫자여야 합니다.' })
  @Min(0, { message: '최소 선택 개수는 0 이상이어야 합니다.' })
  minSelections?: number;

  @ApiProperty({
    description: '다중 선택 시 최대 선택 개수',
    required: false,
    minimum: 1
  })
  @IsOptional()
  @IsNumber({}, { message: '최대 선택 개수는 숫자여야 합니다.' })
  @Min(1, { message: '최대 선택 개수는 1 이상이어야 합니다.' })
  maxSelections?: number;

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
 * 메뉴 옵션 생성 DTO
 */
export class CreateMenuOptionDto {
  @ApiProperty({
    description: '옵션명',
    example: '보통맛',
    minLength: 1,
    maxLength: 50
  })
  @IsString({ message: '옵션명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '옵션명을 입력해주세요.' })
  @MaxLength(50, { message: '옵션명은 최대 50자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '옵션 설명',
    example: '적당한 매운맛입니다.',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '옵션 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '옵션 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '추가 가격 (원)',
    example: 1000,
    minimum: 0
  })
  @IsNumber({}, { message: '추가 가격은 숫자여야 합니다.' })
  @Min(0, { message: '추가 가격은 0 이상이어야 합니다.' })
  additionalPrice: number;

  @ApiProperty({
    description: '재고 수량 (무제한인 경우 null)',
    example: 50,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '재고 수량은 숫자여야 합니다.' })
  @Min(0, { message: '재고 수량은 0 이상이어야 합니다.' })
  stockQuantity?: number;

  @ApiProperty({
    description: '품절 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '품절 여부는 boolean 값이어야 합니다.' })
  isOutOfStock?: boolean;

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
 * 메뉴 옵션 수정 DTO
 */
export class UpdateMenuOptionDto {
  @ApiProperty({
    description: '옵션명',
    required: false,
    minLength: 1,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '옵션명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '옵션명을 입력해주세요.' })
  @MaxLength(50, { message: '옵션명은 최대 50자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '옵션 설명',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '옵션 설명은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '옵션 설명은 최대 200자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '추가 가격 (원)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '추가 가격은 숫자여야 합니다.' })
  @Min(0, { message: '추가 가격은 0 이상이어야 합니다.' })
  additionalPrice?: number;

  @ApiProperty({
    description: '재고 수량 (무제한인 경우 null)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '재고 수량은 숫자여야 합니다.' })
  @Min(0, { message: '재고 수량은 0 이상이어야 합니다.' })
  stockQuantity?: number;

  @ApiProperty({
    description: '품절 여부',
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '품절 여부는 boolean 값이어야 합니다.' })
  isOutOfStock?: boolean;

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
 * 옵션 순서 변경 DTO
 */
export class ReorderOptionsDto {
  @ApiProperty({
    description: '옵션 ID와 정렬 순서 매핑',
    example: { 'option-1': 1, 'option-2': 2, 'option-3': 3 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  optionOrders: Record<string, number>;
}

/**
 * 옵션 그룹 응답 인터페이스
 */
export interface OptionGroupResponse {
  id: string;
  menuItemId: string;
  name: string;
  description?: string;
  type: OptionGroupType;
  isRequired: boolean;
  minSelections?: number;
  maxSelections?: number;
  sortOrder: number;
  isActive: boolean;
  options: MenuOptionResponse[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 메뉴 옵션 응답 인터페이스
 */
export interface MenuOptionResponse {
  id: string;
  optionGroupId: string;
  name: string;
  description?: string;
  additionalPrice: number;
  stockQuantity?: number;
  isOutOfStock: boolean;
  sortOrder: number;
  isActive: boolean;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
} 