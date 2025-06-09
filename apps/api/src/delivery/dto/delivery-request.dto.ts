/**
 * 배달 요청 DTO
 * 
 * 주문에 대한 배달 요청을 생성하고 관리하는 데이터 구조입니다.
 */

import { 
  IsUUID, 
  IsNotEmpty, 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsNumber, 
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 배달 요청 상태 열거형
 */
export enum DeliveryRequestStatus {
  PENDING = 'pending',           // 대기 중
  ASSIGNED = 'assigned',         // 배정됨
  ACCEPTED = 'accepted',         // 수락됨
  PICKED_UP = 'picked_up',       // 픽업 완료
  DELIVERING = 'delivering',     // 배달 중
  DELIVERED = 'delivered',       // 배달 완료
  CANCELLED = 'cancelled',       // 취소됨
  FAILED = 'failed'             // 실패
}

/**
 * 배달 우선순위 열거형
 */
export enum DeliveryPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * 위치 정보 DTO
 */
export class LocationDto {
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

  @ApiProperty({ description: '주소', example: '서울시 중구 명동길 123' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: '상세 주소', example: '101호' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '우편번호', example: '04536' })
  @IsOptional()
  @IsString()
  zipCode?: string;
}

/**
 * 배달 요청 생성 DTO
 */
export class CreateDeliveryRequestDto {
  @ApiProperty({ description: '주문 ID', example: 'uuid' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: '픽업 위치 정보', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ApiProperty({ description: '배송 위치 정보', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  deliveryLocation: LocationDto;

  @ApiProperty({ 
    description: '배달 우선순위', 
    enum: DeliveryPriority,
    example: DeliveryPriority.NORMAL
  })
  @IsEnum(DeliveryPriority)
  priority: DeliveryPriority;

  @ApiPropertyOptional({ description: '예상 거리(km)', example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDistance?: number;

  @ApiPropertyOptional({ description: '예상 소요 시간(분)', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: '특별 지시사항' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: '고객 연락처' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: '고객명' })
  @IsOptional()
  @IsString()
  customerName?: string;
}

/**
 * 배달 요청 업데이트 DTO
 */
export class UpdateDeliveryRequestDto {
  @ApiPropertyOptional({ 
    description: '배달 요청 상태', 
    enum: DeliveryRequestStatus
  })
  @IsOptional()
  @IsEnum(DeliveryRequestStatus)
  status?: DeliveryRequestStatus;

  @ApiPropertyOptional({ 
    description: '배달 우선순위', 
    enum: DeliveryPriority
  })
  @IsOptional()
  @IsEnum(DeliveryPriority)
  priority?: DeliveryPriority;

  @ApiPropertyOptional({ description: '특별 지시사항' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: '취소 사유' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

/**
 * 배달 요청 조회 쿼리 DTO
 */
export class GetDeliveryRequestsQueryDto {
  @ApiPropertyOptional({ 
    description: '상태 필터', 
    enum: DeliveryRequestStatus,
    isArray: true
  })
  @IsOptional()
  @IsEnum(DeliveryRequestStatus, { each: true })
  status?: DeliveryRequestStatus[];

  @ApiPropertyOptional({ 
    description: '우선순위 필터', 
    enum: DeliveryPriority,
    isArray: true
  })
  @IsOptional()
  @IsEnum(DeliveryPriority, { each: true })
  priority?: DeliveryPriority[];

  @ApiPropertyOptional({ description: '페이지 번호', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '시작 날짜 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 배달 요청 응답 DTO
 */
export class DeliveryRequestResponseDto {
  @ApiProperty({ description: '배달 요청 ID' })
  id: string;

  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ description: '픽업 위치 정보', type: LocationDto })
  pickupLocation: LocationDto;

  @ApiProperty({ description: '배송 위치 정보', type: LocationDto })
  deliveryLocation: LocationDto;

  @ApiProperty({ 
    description: '상태', 
    enum: DeliveryRequestStatus
  })
  status: DeliveryRequestStatus;

  @ApiProperty({ 
    description: '우선순위', 
    enum: DeliveryPriority
  })
  priority: DeliveryPriority;

  @ApiPropertyOptional({ description: '배정된 배달기사 ID' })
  assignedDriverId?: string;

  @ApiPropertyOptional({ description: '예상 거리(km)' })
  estimatedDistance?: number;

  @ApiPropertyOptional({ description: '예상 소요 시간(분)' })
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: '특별 지시사항' })
  specialInstructions?: string;

  @ApiPropertyOptional({ description: '고객 연락처' })
  customerPhone?: string;

  @ApiPropertyOptional({ description: '고객명' })
  customerName?: string;

  @ApiPropertyOptional({ description: '취소 사유' })
  cancellationReason?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '배정일시' })
  assignedAt?: Date;

  @ApiPropertyOptional({ description: '완료일시' })
  completedAt?: Date;
} 