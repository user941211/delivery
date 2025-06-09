/**
 * 주소 관리 DTO
 * 
 * 사용자 주소 관련 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 주소 생성 요청 DTO
 */
export class CreateAddressDto {
  @ApiProperty({
    description: '주소 별칭 (예: 집, 회사)',
    example: '집',
    minLength: 1,
    maxLength: 20
  })
  @IsString({ message: '주소 별칭은 문자열이어야 합니다.' })
  @MinLength(1, { message: '주소 별칭을 입력해주세요.' })
  @MaxLength(20, { message: '주소 별칭은 최대 20자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '기본 주소 (도로명 주소)',
    example: '서울시 강남구 테헤란로 123',
    minLength: 5,
    maxLength: 100
  })
  @IsString({ message: '주소는 문자열이어야 합니다.' })
  @MinLength(5, { message: '주소는 최소 5자 이상이어야 합니다.' })
  @MaxLength(100, { message: '주소는 최대 100자까지 가능합니다.' })
  address: string;

  @ApiProperty({
    description: '상세 주소 (동, 호수 등)',
    example: '101동 1001호',
    required: false,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '상세 주소는 최대 50자까지 가능합니다.' })
  detailAddress?: string;

  @ApiProperty({
    description: '우편번호',
    example: '06234',
    pattern: '^\\d{5}$'
  })
  @IsString({ message: '우편번호는 문자열이어야 합니다.' })
  @Matches(/^\d{5}$/, {
    message: '올바른 우편번호 형식이 아닙니다. (5자리 숫자)'
  })
  zipCode: string;

  @ApiProperty({
    description: '위도',
    example: 37.5665,
    required: false
  })
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: '경도',
    example: 126.9780,
    required: false
  })
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: '기본 주소로 설정 여부',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '기본 주소 설정은 boolean 값이어야 합니다.' })
  isDefault?: boolean;

  @ApiProperty({
    description: '배달 요청사항',
    example: '문 앞에 두고 벨 눌러주세요',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '배달 요청사항은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '배달 요청사항은 최대 200자까지 가능합니다.' })
  deliveryInstructions?: string;
}

/**
 * 주소 업데이트 요청 DTO
 */
export class UpdateAddressDto {
  @ApiProperty({
    description: '주소 별칭',
    example: '새로운 집',
    required: false,
    minLength: 1,
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: '주소 별칭은 문자열이어야 합니다.' })
  @MinLength(1, { message: '주소 별칭을 입력해주세요.' })
  @MaxLength(20, { message: '주소 별칭은 최대 20자까지 가능합니다.' })
  name?: string;

  @ApiProperty({
    description: '기본 주소',
    example: '서울시 서초구 서초대로 456',
    required: false,
    minLength: 5,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: '주소는 문자열이어야 합니다.' })
  @MinLength(5, { message: '주소는 최소 5자 이상이어야 합니다.' })
  @MaxLength(100, { message: '주소는 최대 100자까지 가능합니다.' })
  address?: string;

  @ApiProperty({
    description: '상세 주소',
    example: '201동 2001호',
    required: false,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '상세 주소는 최대 50자까지 가능합니다.' })
  detailAddress?: string;

  @ApiProperty({
    description: '우편번호',
    example: '06789',
    required: false,
    pattern: '^\\d{5}$'
  })
  @IsOptional()
  @IsString({ message: '우편번호는 문자열이어야 합니다.' })
  @Matches(/^\d{5}$/, {
    message: '올바른 우편번호 형식이 아닙니다. (5자리 숫자)'
  })
  zipCode?: string;

  @ApiProperty({
    description: '위도',
    example: 37.4844,
    required: false
  })
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: '경도',
    example: 126.8967,
    required: false
  })
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: '배달 요청사항',
    example: '경비실에 맡겨주세요',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: '배달 요청사항은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '배달 요청사항은 최대 200자까지 가능합니다.' })
  deliveryInstructions?: string;
}

/**
 * 주소 응답 인터페이스
 */
export interface AddressResponse {
  id: string;
  userId: string;
  name: string;
  address: string;
  detailAddress?: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  deliveryInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
} 