/**
 * 영업시간 관리 DTO
 * 
 * 레스토랑 영업시간 설정 및 관리 관련 데이터 전송 객체들을 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  IsArray,
  Min, 
  Max,
  Matches,
  ValidateNested,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 영업시간 설정 DTO
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
 * 영업시간 일괄 업데이트 DTO
 */
export class UpdateBusinessHoursDto {
  @ApiProperty({
    description: '영업시간 정보 배열',
    type: [BusinessHoursDto],
    isArray: true
  })
  @IsArray({ message: '영업시간은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];
}

/**
 * 특별 영업일 설정 DTO
 */
export class SpecialBusinessHoursDto {
  @ApiProperty({
    description: '특별 영업일 날짜 (YYYY-MM-DD 형식)',
    example: '2024-12-25'
  })
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({
    description: '개점 시간 (HH:mm 형식)',
    example: '10:00',
    required: false
  })
  @IsOptional()
  @IsString({ message: '개점 시간은 문자열이어야 합니다.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '올바른 시간 형식이 아닙니다. (HH:mm)'
  })
  openTime?: string;

  @ApiProperty({
    description: '폐점 시간 (HH:mm 형식)',
    example: '20:00',
    required: false
  })
  @IsOptional()
  @IsString({ message: '폐점 시간은 문자열이어야 합니다.' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '올바른 시간 형식이 아닙니다. (HH:mm)'
  })
  closeTime?: string;

  @ApiProperty({
    description: '휴무일 여부',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: '휴무일 여부는 boolean 값이어야 합니다.' })
  isClosed?: boolean;

  @ApiProperty({
    description: '특별 영업일 설명',
    example: '크리스마스 특별 영업',
    required: false
  })
  @IsOptional()
  @IsString({ message: '설명은 문자열이어야 합니다.' })
  description?: string;
}

/**
 * 영업 상태 확인 응답 인터페이스
 */
export interface BusinessStatusResponse {
  /** 현재 영업 중 여부 */
  isOpen: boolean;
  /** 현재 시간 */
  currentTime: string;
  /** 오늘 영업시간 */
  todayHours?: {
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  };
  /** 다음 영업 시작 시간 */
  nextOpenTime?: string;
  /** 특별 영업일 정보 */
  specialHours?: {
    date: string;
    openTime?: string;
    closeTime?: string;
    isClosed: boolean;
    description?: string;
  };
}

/**
 * 요일별 영업시간 응답 인터페이스
 */
export interface WeeklyBusinessHoursResponse {
  /** 요일별 영업시간 */
  weeklyHours: {
    dayOfWeek: number;
    dayName: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
  /** 특별 영업일 목록 */
  specialHours: {
    date: string;
    openTime?: string;
    closeTime?: string;
    isClosed: boolean;
    description?: string;
  }[];
} 