/**
 * 레스토랑 관리 DTO
 * 
 * 레스토랑 생성, 수정, 조회 관련 데이터 전송 객체들을 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsArray, 
  IsIn, 
  IsBoolean,
  MinLength, 
  MaxLength, 
  Min, 
  Max,
  Matches,
  ValidateNested,
  IsPhoneNumber,
  IsEmail,
  IsUrl
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryType } from '@delivery-platform/shared/src/types/restaurant';

// 배달 타입 상수 정의
const DELIVERY_TYPES: DeliveryType[] = ['delivery', 'pickup', 'dine_in'];

/**
 * 주소 정보 DTO
 */
export class AddressDto {
  @ApiProperty({
    description: '기본 주소',
    example: '서울시 강남구 테헤란로 123'
  })
  @IsString({ message: '주소는 문자열이어야 합니다.' })
  @MinLength(5, { message: '주소는 최소 5자 이상이어야 합니다.' })
  address: string;

  @ApiProperty({
    description: '상세 주소',
    example: '101동 1001호',
    required: false
  })
  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  detailAddress?: string;

  @ApiProperty({
    description: '우편번호',
    example: '06234'
  })
  @IsString({ message: '우편번호는 문자열이어야 합니다.' })
  @Matches(/^\d{5}$/, { message: '올바른 우편번호 형식이 아닙니다. (5자리 숫자)' })
  zipCode: string;

  @ApiProperty({
    description: '위도',
    example: 37.5665
  })
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @Min(-90, { message: '위도는 -90 이상이어야 합니다.' })
  @Max(90, { message: '위도는 90 이하여야 합니다.' })
  latitude: number;

  @ApiProperty({
    description: '경도',
    example: 126.9780
  })
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다.' })
  @Max(180, { message: '경도는 180 이하여야 합니다.' })
  longitude: number;
}

/**
 * 연락처 정보 DTO
 */
export class ContactInfoDto {
  @ApiProperty({
    description: '전화번호',
    example: '02-1234-5678'
  })
  @IsString({ message: '전화번호는 문자열이어야 합니다.' })
  @IsPhoneNumber('KR', { message: '올바른 한국 전화번호 형식이 아닙니다.' })
  phone: string;

  @ApiProperty({
    description: '이메일',
    example: 'restaurant@example.com'
  })
  @IsString({ message: '이메일은 문자열이어야 합니다.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({
    description: '웹사이트 URL',
    example: 'https://restaurant.com',
    required: false
  })
  @IsOptional()
  @IsString({ message: '웹사이트 URL은 문자열이어야 합니다.' })
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  website?: string;
}

/**
 * 영업시간 DTO
 */
export class BusinessHoursDto {
  @ApiProperty({
    description: '요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)',
    example: 1,
    minimum: 0,
    maximum: 6
  })
  @IsNumber({}, { message: '요일은 숫자여야 합니다.' })
  @Min(0, { message: '요일은 0 이상이어야 합니다.' })
  @Max(6, { message: '요일은 6 이하여야 합니다.' })
  dayOfWeek: number;

  @ApiProperty({
    description: '개점 시간 (HH:mm 형식)',
    example: '09:00'
  })
  @IsString({ message: '개점 시간은 문자열이어야 합니다.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '올바른 시간 형식이 아닙니다. (HH:mm)'
  })
  openTime: string;

  @ApiProperty({
    description: '폐점 시간 (HH:mm 형식)',
    example: '22:00'
  })
  @IsString({ message: '폐점 시간은 문자열이어야 합니다.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '올바른 시간 형식이 아닙니다. (HH:mm)'
  })
  closeTime: string;

  @ApiProperty({
    description: '휴무일 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '휴무일 여부는 boolean 값이어야 합니다.' })
  isClosed?: boolean;
}

/**
 * 레스토랑 생성 DTO
 */
export class CreateRestaurantDto {
  @ApiProperty({
    description: '음식점명',
    example: '맛있는 한식당',
    minLength: 2,
    maxLength: 50
  })
  @IsString({ message: '음식점명은 문자열이어야 합니다.' })
  @MinLength(2, { message: '음식점명은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '음식점명은 최대 50자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '음식점 설명',
    example: '전통 한식을 현대적으로 재해석한 음식점입니다.',
    minLength: 10,
    maxLength: 500
  })
  @IsString({ message: '음식점 설명은 문자열이어야 합니다.' })
  @MinLength(10, { message: '음식점 설명은 최소 10자 이상이어야 합니다.' })
  @MaxLength(500, { message: '음식점 설명은 최대 500자까지 가능합니다.' })
  description: string;

  @ApiProperty({
    description: '사업자 등록번호 (xxx-xx-xxxxx 형식)',
    example: '123-45-67890'
  })
  @IsString({ message: '사업자 등록번호는 문자열이어야 합니다.' })
  @Matches(/^\d{3}-\d{2}-\d{5}$/, {
    message: '올바른 사업자 등록번호 형식이 아닙니다. (xxx-xx-xxxxx)'
  })
  businessRegistrationNumber: string;

  @ApiProperty({
    description: '주소 정보',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({
    description: '연락처 정보',
    type: ContactInfoDto
  })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact: ContactInfoDto;

  @ApiProperty({
    description: '영업시간 정보',
    type: [BusinessHoursDto],
    isArray: true
  })
  @IsArray({ message: '영업시간은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];

  @ApiProperty({
    description: '배달 가능 타입',
    enum: ['delivery', 'pickup', 'dine_in'],
    isArray: true,
    example: ['delivery', 'pickup']
  })
  @IsArray({ message: '배달 타입은 배열이어야 합니다.' })
  @IsIn(DELIVERY_TYPES, { each: true, message: '올바른 배달 타입이 아닙니다.' })
  deliveryTypes: DeliveryType[];

  @ApiProperty({
    description: '최소 주문 금액 (원)',
    example: 15000,
    minimum: 0
  })
  @IsNumber({}, { message: '최소 주문 금액은 숫자여야 합니다.' })
  @Min(0, { message: '최소 주문 금액은 0 이상이어야 합니다.' })
  minimumOrderAmount: number;

  @ApiProperty({
    description: '배달비 (원)',
    example: 3000,
    minimum: 0
  })
  @IsNumber({}, { message: '배달비는 숫자여야 합니다.' })
  @Min(0, { message: '배달비는 0 이상이어야 합니다.' })
  deliveryFee: number;

  @ApiProperty({
    description: '배달 가능 거리 (km)',
    example: 5,
    minimum: 0.1,
    maximum: 50
  })
  @IsNumber({}, { message: '배달 가능 거리는 숫자여야 합니다.' })
  @Min(0.1, { message: '배달 가능 거리는 0.1km 이상이어야 합니다.' })
  @Max(50, { message: '배달 가능 거리는 50km 이하여야 합니다.' })
  deliveryRadius: number;

  @ApiProperty({
    description: '예상 조리 시간 (분)',
    example: 30,
    minimum: 5,
    maximum: 120
  })
  @IsNumber({}, { message: '예상 조리 시간은 숫자여야 합니다.' })
  @Min(5, { message: '예상 조리 시간은 5분 이상이어야 합니다.' })
  @Max(120, { message: '예상 조리 시간은 120분 이하여야 합니다.' })
  preparationTime: number;

  @ApiProperty({
    description: '음식 카테고리 ID 목록',
    example: ['korean', 'traditional'],
    isArray: true
  })
  @IsArray({ message: '카테고리 ID는 배열이어야 합니다.' })
  @IsString({ each: true, message: '카테고리 ID는 문자열이어야 합니다.' })
  categoryIds: string[];
}

/**
 * 레스토랑 수정 DTO
 */
export class UpdateRestaurantDto {
  @ApiProperty({
    description: '음식점명',
    example: '새로운 음식점명',
    required: false,
    minLength: 2,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '음식점명은 문자열이어야 합니다.' })
  @MinLength(2, { message: '음식점명은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '음식점명은 최대 50자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '음식점 설명',
    example: '새로운 음식점 설명',
    required: false,
    minLength: 10,
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: '음식점 설명은 문자열이어야 합니다.' })
  @MinLength(10, { message: '음식점 설명은 최소 10자 이상이어야 합니다.' })
  @MaxLength(500, { message: '음식점 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  @ApiProperty({
    description: '연락처 정보',
    type: ContactInfoDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact?: ContactInfoDto;

  @ApiProperty({
    description: '영업시간 정보',
    type: [BusinessHoursDto],
    required: false,
    isArray: true
  })
  @IsOptional()
  @IsArray({ message: '영업시간은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto[];

  @ApiProperty({
    description: '배달 가능 타입',
    enum: ['delivery', 'pickup', 'dine_in'],
    required: false,
    isArray: true
  })
  @IsOptional()
  @IsArray({ message: '배달 타입은 배열이어야 합니다.' })
  @IsIn(DELIVERY_TYPES, { each: true, message: '올바른 배달 타입이 아닙니다.' })
  deliveryTypes?: DeliveryType[];

  @ApiProperty({
    description: '최소 주문 금액 (원)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '최소 주문 금액은 숫자여야 합니다.' })
  @Min(0, { message: '최소 주문 금액은 0 이상이어야 합니다.' })
  minimumOrderAmount?: number;

  @ApiProperty({
    description: '배달비 (원)',
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: '배달비는 숫자여야 합니다.' })
  @Min(0, { message: '배달비는 0 이상이어야 합니다.' })
  deliveryFee?: number;

  @ApiProperty({
    description: '배달 가능 거리 (km)',
    required: false,
    minimum: 0.1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber({}, { message: '배달 가능 거리는 숫자여야 합니다.' })
  @Min(0.1, { message: '배달 가능 거리는 0.1km 이상이어야 합니다.' })
  @Max(50, { message: '배달 가능 거리는 50km 이하여야 합니다.' })
  deliveryRadius?: number;

  @ApiProperty({
    description: '예상 조리 시간 (분)',
    required: false,
    minimum: 5,
    maximum: 120
  })
  @IsOptional()
  @IsNumber({}, { message: '예상 조리 시간은 숫자여야 합니다.' })
  @Min(5, { message: '예상 조리 시간은 5분 이상이어야 합니다.' })
  @Max(120, { message: '예상 조리 시간은 120분 이하여야 합니다.' })
  preparationTime?: number;
} 