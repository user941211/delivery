/**
 * 배달기사 위치 추적 DTO
 * 
 * 배달기사의 실시간 위치 정보를 관리하는 데이터 구조입니다.
 */

import { 
  IsUUID, 
  IsNotEmpty, 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  IsDateString,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 배달기사 활성 상태 열거형
 */
export enum DriverStatus {
  OFFLINE = 'offline',       // 오프라인
  ONLINE = 'online',         // 온라인 (배달 가능)
  BUSY = 'busy',             // 배달 중
  BREAK = 'break',           // 휴식 중
  UNAVAILABLE = 'unavailable' // 일시적 불가
}

/**
 * 배달기사 위치 업데이트 DTO
 */
export class UpdateDriverLocationDto {
  @ApiProperty({ description: '위도', example: 37.5665 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: '경도', example: 126.9780 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ 
    description: '배달기사 상태', 
    enum: DriverStatus,
    example: DriverStatus.ONLINE
  })
  @IsEnum(DriverStatus)
  status: DriverStatus;

  @ApiPropertyOptional({ description: '정확도 (미터)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ description: '속도 (m/s)', example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;

  @ApiPropertyOptional({ description: '방향 (도)', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  bearing?: number;

  @ApiPropertyOptional({ description: '고도 (미터)', example: 100 })
  @IsOptional()
  @IsNumber()
  altitude?: number;
}

/**
 * 배달기사 상태 변경 DTO
 */
export class UpdateDriverStatusDto {
  @ApiProperty({ 
    description: '배달기사 상태', 
    enum: DriverStatus
  })
  @IsEnum(DriverStatus)
  status: DriverStatus;

  @ApiPropertyOptional({ description: '상태 변경 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 주변 배달기사 검색 쿼리 DTO
 */
export class FindNearbyDriversQueryDto {
  @ApiProperty({ description: '중심점 위도', example: 37.5665 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: '중심점 경도', example: 126.9780 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ 
    description: '검색 반경 (킬로미터)', 
    example: 5,
    default: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number = 5;

  @ApiPropertyOptional({ 
    description: '배달기사 상태 필터', 
    enum: DriverStatus,
    isArray: true,
    example: [DriverStatus.ONLINE]
  })
  @IsOptional()
  @IsEnum(DriverStatus, { each: true })
  status?: DriverStatus[] = [DriverStatus.ONLINE];

  @ApiPropertyOptional({ 
    description: '최대 결과 수', 
    example: 10,
    default: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: '정렬 기준: distance(거리) 또는 rating(평점)', 
    example: 'distance',
    default: 'distance'
  })
  @IsOptional()
  @IsString()
  sortBy?: 'distance' | 'rating' = 'distance';
}

/**
 * 배달기사 위치 응답 DTO
 */
export class DriverLocationResponseDto {
  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ description: '위도' })
  latitude: number;

  @ApiProperty({ description: '경도' })
  longitude: number;

  @ApiProperty({ 
    description: '상태', 
    enum: DriverStatus
  })
  status: DriverStatus;

  @ApiPropertyOptional({ description: '정확도 (미터)' })
  accuracy?: number;

  @ApiPropertyOptional({ description: '속도 (m/s)' })
  speed?: number;

  @ApiPropertyOptional({ description: '방향 (도)' })
  bearing?: number;

  @ApiPropertyOptional({ description: '고도 (미터)' })
  altitude?: number;

  @ApiProperty({ description: '마지막 업데이트 시간' })
  lastUpdated: Date;

  @ApiProperty({ description: '온라인 상태 시작 시간' })
  onlineSince?: Date;
}

/**
 * 주변 배달기사 정보 DTO
 */
export class NearbyDriverDto {
  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ description: '배달기사명' })
  driverName: string;

  @ApiProperty({ description: '위도' })
  latitude: number;

  @ApiProperty({ description: '경도' })
  longitude: number;

  @ApiProperty({ 
    description: '상태', 
    enum: DriverStatus
  })
  status: DriverStatus;

  @ApiProperty({ description: '거리 (킬로미터)' })
  distance: number;

  @ApiPropertyOptional({ description: '예상 도착 시간 (분)' })
  estimatedArrivalTime?: number;

  @ApiPropertyOptional({ description: '배달기사 평점' })
  rating?: number;

  @ApiPropertyOptional({ description: '완료한 배달 수' })
  completedDeliveries?: number;

  @ApiPropertyOptional({ description: '차량 유형' })
  vehicleType?: string;

  @ApiProperty({ description: '마지막 업데이트 시간' })
  lastUpdated: Date;
}

/**
 * 배달기사 위치 히스토리 쿼리 DTO
 */
export class DriverLocationHistoryQueryDto {
  @ApiProperty({ description: '배달기사 ID' })
  @IsUUID()
  driverId: string;

  @ApiPropertyOptional({ description: '시작 날짜 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지 번호', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

/**
 * 배달기사 활동 통계 DTO
 */
export class DriverActivityStatsDto {
  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ description: '오늘 온라인 시간 (분)' })
  onlineTimeToday: number;

  @ApiProperty({ description: '이번 주 온라인 시간 (분)' })
  onlineTimeThisWeek: number;

  @ApiProperty({ description: '총 이동 거리 (킬로미터)' })
  totalDistance: number;

  @ApiProperty({ description: '평균 이동 속도 (km/h)' })
  averageSpeed: number;

  @ApiProperty({ description: '마지막 활동 시간' })
  lastActivity: Date;

  @ApiProperty({ description: '현재 상태' })
  currentStatus: DriverStatus;
} 