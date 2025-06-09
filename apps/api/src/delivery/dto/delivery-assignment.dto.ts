/**
 * 배달 배정 및 응답 DTO
 * 
 * 배달 요청과 배달기사 간의 매칭 및 응답을 관리하는 데이터 구조입니다.
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
  IsArray,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 배달 배정 상태 열거형
 */
export enum DeliveryAssignmentStatus {
  PENDING = 'pending',           // 배정 대기 중
  ASSIGNED = 'assigned',         // 배정됨 (응답 대기)
  ACCEPTED = 'accepted',         // 수락됨
  REJECTED = 'rejected',         // 거부됨
  EXPIRED = 'expired',           // 시간 만료
  CANCELLED = 'cancelled'        // 취소됨
}

/**
 * 배달기사 응답 유형 열거형
 */
export enum DriverResponseType {
  ACCEPT = 'accept',             // 수락
  REJECT = 'reject',             // 거부
  TIMEOUT = 'timeout'            // 응답 시간 초과
}

/**
 * 배정 방식 열거형
 */
export enum AssignmentMethod {
  MANUAL = 'manual',             // 수동 배정
  AUTO_NEAREST = 'auto_nearest', // 자동 배정 (가장 가까운 기사)
  AUTO_OPTIMAL = 'auto_optimal', // 자동 배정 (최적화)
  BROADCAST = 'broadcast'        // 브로드캐스트 (여러 기사에게 동시 요청)
}

/**
 * 수동 배달 배정 DTO
 */
export class ManualAssignDeliveryDto {
  @ApiProperty({ description: '배달 요청 ID' })
  @IsUUID()
  deliveryRequestId: string;

  @ApiProperty({ description: '배달기사 ID' })
  @IsUUID()
  driverId: string;

  @ApiPropertyOptional({ description: '배정 메모' })
  @IsOptional()
  @IsString()
  assignmentNote?: string;

  @ApiPropertyOptional({ 
    description: '응답 제한 시간 (분)', 
    example: 5,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  responseTimeoutMinutes?: number = 5;
}

/**
 * 자동 배달 배정 DTO
 */
export class AutoAssignDeliveryDto {
  @ApiProperty({ description: '배달 요청 ID' })
  @IsUUID()
  deliveryRequestId: string;

  @ApiProperty({ 
    description: '배정 방식', 
    enum: AssignmentMethod,
    example: AssignmentMethod.AUTO_NEAREST
  })
  @IsEnum(AssignmentMethod)
  method: AssignmentMethod;

  @ApiPropertyOptional({ 
    description: '검색 반경 (킬로미터)', 
    example: 5,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  searchRadius?: number = 5;

  @ApiPropertyOptional({ 
    description: '최대 배정 시도 횟수', 
    example: 3,
    default: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number = 3;

  @ApiPropertyOptional({ 
    description: '응답 제한 시간 (분)', 
    example: 5,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  responseTimeoutMinutes?: number = 5;

  @ApiPropertyOptional({ 
    description: '제외할 배달기사 ID 목록',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludeDriverIds?: string[];
}

/**
 * 브로드캐스트 배달 배정 DTO
 */
export class BroadcastAssignDeliveryDto {
  @ApiProperty({ description: '배달 요청 ID' })
  @IsUUID()
  deliveryRequestId: string;

  @ApiPropertyOptional({ 
    description: '대상 배달기사 ID 목록 (지정하지 않으면 주변 모든 가능한 기사)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetDriverIds?: string[];

  @ApiPropertyOptional({ 
    description: '검색 반경 (킬로미터)', 
    example: 10,
    default: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  searchRadius?: number = 10;

  @ApiPropertyOptional({ 
    description: '응답 제한 시간 (분)', 
    example: 3,
    default: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  responseTimeoutMinutes?: number = 3;

  @ApiPropertyOptional({ 
    description: '최대 동시 배정 수', 
    example: 5,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentAssignments?: number = 5;
}

/**
 * 배달기사 응답 DTO
 */
export class DriverResponseDto {
  @ApiProperty({ description: '배달 배정 ID' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ 
    description: '응답 유형', 
    enum: DriverResponseType
  })
  @IsEnum(DriverResponseType)
  response: DriverResponseType;

  @ApiPropertyOptional({ description: '응답 메시지' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: '예상 픽업 시간 (분)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  estimatedPickupTimeMinutes?: number;
}

/**
 * 배달 배정 취소 DTO
 */
export class CancelAssignmentDto {
  @ApiProperty({ description: '배달 배정 ID' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ description: '취소 사유' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: '재배정 여부', default: true })
  @IsOptional()
  @IsBoolean()
  shouldReassign?: boolean = true;
}

/**
 * 배달 배정 조회 쿼리 DTO
 */
export class GetDeliveryAssignmentsQueryDto {
  @ApiPropertyOptional({ 
    description: '배정 상태 필터', 
    enum: DeliveryAssignmentStatus,
    isArray: true
  })
  @IsOptional()
  @IsEnum(DeliveryAssignmentStatus, { each: true })
  status?: DeliveryAssignmentStatus[];

  @ApiPropertyOptional({ 
    description: '배정 방식 필터', 
    enum: AssignmentMethod,
    isArray: true
  })
  @IsOptional()
  @IsEnum(AssignmentMethod, { each: true })
  method?: AssignmentMethod[];

  @ApiPropertyOptional({ description: '배달기사 ID 필터' })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ description: '배달 요청 ID 필터' })
  @IsOptional()
  @IsUUID()
  deliveryRequestId?: string;

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

  @ApiPropertyOptional({ description: '페이지 크기', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * 배달 배정 응답 DTO
 */
export class DeliveryAssignmentResponseDto {
  @ApiProperty({ description: '배정 ID' })
  id: string;

  @ApiProperty({ description: '배달 요청 ID' })
  deliveryRequestId: string;

  @ApiProperty({ description: '배달기사 ID' })
  driverId: string;

  @ApiProperty({ 
    description: '배정 상태', 
    enum: DeliveryAssignmentStatus
  })
  status: DeliveryAssignmentStatus;

  @ApiProperty({ 
    description: '배정 방식', 
    enum: AssignmentMethod
  })
  method: AssignmentMethod;

  @ApiPropertyOptional({ description: '배정 메모' })
  assignmentNote?: string;

  @ApiPropertyOptional({ description: '응답 메시지' })
  responseMessage?: string;

  @ApiProperty({ description: '배정 일시' })
  assignedAt: Date;

  @ApiPropertyOptional({ description: '응답 일시' })
  respondedAt?: Date;

  @ApiPropertyOptional({ description: '만료 일시' })
  expiresAt?: Date;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '예상 픽업 시간 (분)' })
  estimatedPickupTimeMinutes?: number;

  @ApiPropertyOptional({ description: '배정 시도 횟수' })
  attemptNumber?: number;
}

/**
 * 배달 배정 통계 DTO
 */
export class DeliveryAssignmentStatsDto {
  @ApiProperty({ description: '총 배정 수' })
  totalAssignments: number;

  @ApiProperty({ description: '수락된 배정 수' })
  acceptedAssignments: number;

  @ApiProperty({ description: '거부된 배정 수' })
  rejectedAssignments: number;

  @ApiProperty({ description: '만료된 배정 수' })
  expiredAssignments: number;

  @ApiProperty({ description: '평균 응답 시간 (분)' })
  averageResponseTime: number;

  @ApiProperty({ description: '수락률 (%)' })
  acceptanceRate: number;

  @ApiProperty({ description: '배정 성공률 (%)' })
  successRate: number;

  @ApiProperty({ description: '기간' })
  period: {
    startDate: Date;
    endDate: Date;
  };
} 