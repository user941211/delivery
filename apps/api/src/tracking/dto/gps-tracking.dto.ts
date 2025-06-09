/**
 * GPS 위치 추적 DTO
 * 
 * 고급 GPS 위치 수집 및 관리를 위한 데이터 구조를 정의합니다.
 */

import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray, ValidateNested, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * GPS 정확도 레벨 열거형
 */
export enum GpsAccuracyLevel {
  HIGH = 'high',           // < 5m
  MEDIUM = 'medium',       // 5-20m  
  LOW = 'low',             // > 20m
  UNKNOWN = 'unknown'      // 정확도 정보 없음
}

/**
 * 추적 세션 상태 열거형
 */
export enum TrackingSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * 지오펜스 이벤트 유형 열거형
 */
export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  DWELL = 'dwell'
}

/**
 * 기본 GPS 좌표 DTO
 */
export class GpsCoordinateDto {
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

  @ApiPropertyOptional({ description: '고도 (미터)', example: 100 })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ description: '정확도 (미터)', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

/**
 * 고급 GPS 위치 업데이트 DTO
 */
export class AdvancedGpsUpdateDto extends GpsCoordinateDto {
  @ApiProperty({ description: '배달기사 ID' })
  @IsString()
  @IsUUID()
  driverId: string;

  @ApiPropertyOptional({ description: '주문 ID (배달 중인 경우)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: '속도 (m/s)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;

  @ApiPropertyOptional({ description: '이동 방향 (도)', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  bearing?: number;

  @ApiPropertyOptional({ description: '정확도 레벨', enum: GpsAccuracyLevel })
  @IsOptional()
  @IsEnum(GpsAccuracyLevel)
  accuracyLevel?: GpsAccuracyLevel;

  @ApiPropertyOptional({ description: '타임스탬프 (ISO 문자열)' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: '배터리 레벨 (%)', example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({ description: '신호 강도 (dBm)', example: -70 })
  @IsOptional()
  @IsNumber()
  signalStrength?: number;

  @ApiPropertyOptional({ description: '실내/실외 여부', example: false })
  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean;
}

/**
 * 배치 GPS 위치 업데이트 DTO
 */
export class BatchGpsUpdateDto {
  @ApiProperty({ description: '배달기사 ID' })
  @IsString()
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: 'GPS 위치 데이터 배열', type: [AdvancedGpsUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvancedGpsUpdateDto)
  locations: AdvancedGpsUpdateDto[];

  @ApiPropertyOptional({ description: '세션 ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  sessionId?: string;
}

/**
 * 추적 세션 시작 DTO
 */
export class StartTrackingSessionDto {
  @ApiProperty({ description: '배달기사 ID' })
  @IsString()
  @IsUUID()
  driverId: string;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ description: '시작 위치', type: GpsCoordinateDto })
  @ValidateNested()
  @Type(() => GpsCoordinateDto)
  startLocation: GpsCoordinateDto;

  @ApiPropertyOptional({ description: '예상 종료 시간' })
  @IsOptional()
  @IsDateString()
  estimatedEndTime?: string;
}

/**
 * 지오펜스 정의 DTO
 */
export class GeofenceDto {
  @ApiProperty({ description: '지오펜스 ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: '지오펜스 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '중심 좌표', type: GpsCoordinateDto })
  @ValidateNested()
  @Type(() => GpsCoordinateDto)
  center: GpsCoordinateDto;

  @ApiProperty({ description: '반경 (미터)', example: 100 })
  @IsNumber()
  @Min(1)
  radius: number;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * 지오펜스 이벤트 DTO
 */
export class GeofenceEventDto {
  @ApiProperty({ description: '이벤트 유형', enum: GeofenceEventType })
  @IsEnum(GeofenceEventType)
  eventType: GeofenceEventType;

  @ApiProperty({ description: '지오펜스 ID' })
  @IsString()
  @IsUUID()
  geofenceId: string;

  @ApiProperty({ description: '배달기사 ID' })
  @IsString()
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: '이벤트 발생 위치', type: GpsCoordinateDto })
  @ValidateNested()
  @Type(() => GpsCoordinateDto)
  location: GpsCoordinateDto;

  @ApiProperty({ description: '이벤트 발생 시간' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @IsOptional()
  metadata?: any;
}

/**
 * 추적 세션 응답 DTO
 */
export class TrackingSessionResponseDto {
  @ApiProperty({ description: '세션 ID' })
  sessionId: string;

  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ description: '주문 ID' })
  orderId?: string;

  @ApiProperty({ description: '세션 상태', enum: TrackingSessionStatus })
  status: TrackingSessionStatus;

  @ApiProperty({ description: '시작 시간' })
  startTime: Date;

  @ApiProperty({ description: '종료 시간' })
  endTime?: Date;

  @ApiProperty({ description: '시작 위치', type: GpsCoordinateDto })
  startLocation: GpsCoordinateDto;

  @ApiProperty({ description: '종료 위치', type: GpsCoordinateDto })
  endLocation?: GpsCoordinateDto;

  @ApiProperty({ description: '총 거리 (미터)' })
  totalDistance: number;

  @ApiProperty({ description: '총 시간 (초)' })
  totalDuration: number;

  @ApiProperty({ description: '평균 속도 (km/h)' })
  averageSpeed: number;
}

/**
 * GPS 추적 통계 DTO
 */
export class GpsTrackingStatsDto {
  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ description: '기간 시작' })
  periodStart: Date;

  @ApiProperty({ description: '기간 종료' })
  periodEnd: Date;

  @ApiProperty({ description: '총 추적 시간 (분)' })
  totalTrackingTime: number;

  @ApiProperty({ description: '총 이동 거리 (km)' })
  totalDistance: number;

  @ApiProperty({ description: '평균 속도 (km/h)' })
  averageSpeed: number;

  @ApiProperty({ description: '최대 속도 (km/h)' })
  maxSpeed: number;

  @ApiProperty({ description: '위치 업데이트 횟수' })
  locationUpdatesCount: number;

  @ApiProperty({ description: '정확도 분포' })
  accuracyDistribution: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
} 