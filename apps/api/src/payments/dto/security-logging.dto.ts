/**
 * 결제 보안 및 로깅 시스템 DTO
 * 
 * 결제 보안, 이상 거래 탐지, 로깅 및 모니터링을 위한 데이터 구조를 정의합니다.
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsIP,
  IsJSON,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 로그 레벨 열거형
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 보안 이벤트 타입 열거형
 */
export enum SecurityEventType {
  SUSPICIOUS_PAYMENT = 'suspicious_payment',
  FAILED_AUTHENTICATION = 'failed_authentication',
  MULTIPLE_ATTEMPTS = 'multiple_attempts',
  UNUSUAL_PATTERN = 'unusual_pattern',
  FRAUD_DETECTED = 'fraud_detected',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PAYMENT_MANIPULATION = 'payment_manipulation'
}

/**
 * 알림 타입 열거형
 */
export enum AlertType {
  SECURITY_BREACH = 'security_breach',
  FRAUD_DETECTION = 'fraud_detection',
  SYSTEM_ERROR = 'system_error',
  PAYMENT_FAILURE = 'payment_failure',
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  PERFORMANCE_ISSUE = 'performance_issue'
}

/**
 * 알림 우선순위 열거형
 */
export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 이상 거래 위험도 열거형
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 결제 로그 DTO
 */
export class PaymentLogDto {
  @ApiProperty({ description: '로그 ID' })
  id: string;

  @ApiProperty({ description: '결제 ID' })
  paymentId: string;

  @ApiProperty({ enum: LogLevel, description: '로그 레벨' })
  level: LogLevel;

  @ApiProperty({ description: '로그 메시지' })
  message: string;

  @ApiProperty({ description: '사용자 ID' })
  userId?: string;

  @ApiProperty({ description: '세션 ID' })
  sessionId?: string;

  @ApiProperty({ description: '요청 IP 주소' })
  ipAddress?: string;

  @ApiProperty({ description: '사용자 에이전트' })
  userAgent?: string;

  @ApiProperty({ description: '결제 금액' })
  amount?: number;

  @ApiProperty({ description: '결제 방법' })
  paymentMethod?: string;

  @ApiProperty({ description: 'PG사' })
  provider?: string;

  @ApiProperty({ description: '거래 ID' })
  transactionId?: string;

  @ApiProperty({ description: '추가 데이터' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '처리 시간 (ms)' })
  processingTime?: number;

  @ApiPropertyOptional({ description: '에러 코드' })
  errorCode?: string;

  @ApiPropertyOptional({ description: '에러 메시지' })
  errorMessage?: string;
}

/**
 * 보안 이벤트 DTO
 */
export class SecurityEventDto {
  @ApiProperty({ description: '이벤트 ID' })
  id: string;

  @ApiProperty({ enum: SecurityEventType, description: '보안 이벤트 타입' })
  eventType: SecurityEventType;

  @ApiProperty({ enum: RiskLevel, description: '위험도' })
  riskLevel: RiskLevel;

  @ApiProperty({ description: '이벤트 제목' })
  title: string;

  @ApiProperty({ description: '이벤트 설명' })
  description: string;

  @ApiPropertyOptional({ description: '관련 사용자 ID' })
  userId?: string;

  @ApiPropertyOptional({ description: '관련 결제 ID' })
  paymentId?: string;

  @ApiProperty({ description: '발생 IP 주소' })
  ipAddress: string;

  @ApiPropertyOptional({ description: '사용자 에이전트' })
  userAgent?: string;

  @ApiProperty({ description: '이벤트 데이터' })
  eventData: Record<string, any>;

  @ApiProperty({ description: '발생 시간' })
  occurredAt: Date;

  @ApiPropertyOptional({ description: '해결 시간' })
  resolvedAt?: Date;

  @ApiPropertyOptional({ description: '해결 상태' })
  resolved?: boolean;

  @ApiPropertyOptional({ description: '처리자 ID' })
  resolvedBy?: string;

  @ApiPropertyOptional({ description: '해결 메모' })
  resolutionNotes?: string;

  @ApiProperty({ description: '자동 차단 여부' })
  autoBlocked: boolean;

  @ApiPropertyOptional({ description: '차단 해제 시간' })
  unblockAt?: Date;
}

/**
 * 이상 거래 탐지 결과 DTO
 */
export class FraudDetectionResultDto {
  @ApiProperty({ description: '결제 ID' })
  paymentId: string;

  @ApiProperty({ enum: RiskLevel, description: '위험도' })
  riskLevel: RiskLevel;

  @ApiProperty({ description: '위험 점수 (0-100)' })
  riskScore: number;

  @ApiProperty({ description: '탐지된 위험 요소' })
  riskFactors: Array<{
    factor: string;
    score: number;
    description: string;
  }>;

  @ApiProperty({ description: '추천 조치' })
  recommendedActions: string[];

  @ApiProperty({ description: '자동 차단 여부' })
  autoBlocked: boolean;

  @ApiProperty({ description: '수동 검토 필요 여부' })
  requiresManualReview: boolean;

  @ApiProperty({ description: '분석 완료 시간' })
  analyzedAt: Date;

  @ApiPropertyOptional({ description: '분석 모델 버전' })
  modelVersion?: string;

  @ApiPropertyOptional({ description: '추가 컨텍스트' })
  context?: {
    customerHistory: {
      totalTransactions: number;
      averageAmount: number;
      lastTransactionDate: Date;
    };
    deviceInfo: {
      deviceId: string;
      firstSeen: Date;
      transactionCount: number;
    };
    locationInfo: {
      country: string;
      city: string;
      isVpn: boolean;
      isProxy: boolean;
    };
  };
}

/**
 * 결제 로그 조회 쿼리 DTO
 */
export class GetPaymentLogsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: LogLevel, description: '로그 레벨 필터' })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({ description: '결제 ID' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: '사용자 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '검색 키워드' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'IP 주소' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: '결제 방법' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '에러만 조회' })
  @IsOptional()
  @IsBoolean()
  errorsOnly?: boolean;
}

/**
 * 보안 이벤트 조회 쿼리 DTO
 */
export class GetSecurityEventsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SecurityEventType, description: '이벤트 타입' })
  @IsOptional()
  @IsEnum(SecurityEventType)
  eventType?: SecurityEventType;

  @ApiPropertyOptional({ enum: RiskLevel, description: '위험도' })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: '해결 상태' })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '사용자 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'IP 주소' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: '자동 차단만 조회' })
  @IsOptional()
  @IsBoolean()
  autoBlockedOnly?: boolean;
}

/**
 * 알림 생성 DTO
 */
export class CreateAlertDto {
  @ApiProperty({ enum: AlertType, description: '알림 타입' })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ enum: AlertPriority, description: '알림 우선순위' })
  @IsEnum(AlertPriority)
  priority: AlertPriority;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ description: '관련 결제 ID' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: '관련 사용자 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '추가 데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: '이메일 발송 여부' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = true;

  @ApiPropertyOptional({ description: '슬랙 발송 여부' })
  @IsOptional()
  @IsBoolean()
  sendSlack?: boolean = false;

  @ApiPropertyOptional({ description: 'SMS 발송 여부' })
  @IsOptional()
  @IsBoolean()
  sendSms?: boolean = false;
}

/**
 * 알림 응답 DTO
 */
export class AlertResponseDto {
  @ApiProperty({ description: '알림 ID' })
  id: string;

  @ApiProperty({ enum: AlertType, description: '알림 타입' })
  type: AlertType;

  @ApiProperty({ enum: AlertPriority, description: '알림 우선순위' })
  priority: AlertPriority;

  @ApiProperty({ description: '알림 제목' })
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  message: string;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '읽음 시간' })
  readAt?: Date;

  @ApiPropertyOptional({ description: '해결 시간' })
  resolvedAt?: Date;

  @ApiProperty({ description: '발송 상태' })
  deliveryStatus: {
    email: { sent: boolean; sentAt?: Date; error?: string };
    slack: { sent: boolean; sentAt?: Date; error?: string };
    sms: { sent: boolean; sentAt?: Date; error?: string };
  };

  @ApiPropertyOptional({ description: '관련 데이터' })
  metadata?: Record<string, any>;
}

/**
 * 보안 대시보드 통계 DTO
 */
export class SecurityDashboardStatsDto {
  @ApiProperty({ description: '오늘 총 거래 수' })
  todayTransactions: number;

  @ApiProperty({ description: '오늘 차단된 거래 수' })
  todayBlockedTransactions: number;

  @ApiProperty({ description: '오늘 보안 이벤트 수' })
  todaySecurityEvents: number;

  @ApiProperty({ description: '활성 알림 수' })
  activeAlerts: number;

  @ApiProperty({ description: '위험도별 통계' })
  riskLevelDistribution: Record<RiskLevel, number>;

  @ApiProperty({ description: '최근 7일 차단 트렌드' })
  weeklyBlockedTrend: Array<{
    date: string;
    blockedCount: number;
    totalCount: number;
    blockRate: number;
  }>;

  @ApiProperty({ description: '상위 위험 요소' })
  topRiskFactors: Array<{
    factor: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: '지역별 위험 분포' })
  riskByLocation: Array<{
    country: string;
    riskScore: number;
    transactionCount: number;
  }>;

  @ApiProperty({ description: '최근 중요 이벤트' })
  recentCriticalEvents: SecurityEventDto[];

  @ApiProperty({ description: '시스템 성능 지표' })
  performanceMetrics: {
    averageProcessingTime: number;
    fraudDetectionAccuracy: number;
    falsePositiveRate: number;
    systemUptime: number;
  };

  @ApiProperty({ description: '통계 생성 시간' })
  generatedAt: Date;
}

/**
 * 이상 거래 분석 요청 DTO
 */
export class AnalyzeTransactionDto {
  @ApiProperty({ description: '결제 ID' })
  @IsString()
  paymentId: string;

  @ApiPropertyOptional({ description: '강제 재분석 여부' })
  @IsOptional()
  @IsBoolean()
  forceReanalysis?: boolean = false;

  @ApiPropertyOptional({ description: '분석 깊이' })
  @IsOptional()
  @IsEnum(['basic', 'detailed', 'comprehensive'])
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive' = 'basic';

  @ApiPropertyOptional({ description: '추가 컨텍스트' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

/**
 * 보안 설정 DTO
 */
export class SecurityConfigDto {
  @ApiProperty({ description: '사기 탐지 활성화' })
  @IsBoolean()
  fraudDetectionEnabled: boolean;

  @ApiProperty({ description: '자동 차단 활성화' })
  @IsBoolean()
  autoBlockingEnabled: boolean;

  @ApiProperty({ description: '위험 점수 임계값' })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScoreThreshold: number;

  @ApiProperty({ description: '일일 거래 한도' })
  @IsNumber()
  @Min(0)
  dailyTransactionLimit: number;

  @ApiProperty({ description: '시간당 거래 한도' })
  @IsNumber()
  @Min(0)
  hourlyTransactionLimit: number;

  @ApiProperty({ description: '허용 국가 목록' })
  @IsArray()
  @IsString({ each: true })
  allowedCountries: string[];

  @ApiProperty({ description: '차단 국가 목록' })
  @IsArray()
  @IsString({ each: true })
  blockedCountries: string[];

  @ApiProperty({ description: 'VPN/프록시 차단 여부' })
  @IsBoolean()
  blockVpnProxy: boolean;

  @ApiProperty({ description: '알림 임계값 설정' })
  alertThresholds: {
    criticalEvents: number;
    failedAttempts: number;
    suspiciousPattern: number;
  };

  @ApiProperty({ description: '로그 보관 기간 (일)' })
  @IsNumber()
  @Min(1)
  @Max(365)
  logRetentionDays: number;
}

/**
 * 감사 로그 DTO
 */
export class AuditLogDto {
  @ApiProperty({ description: '감사 로그 ID' })
  id: string;

  @ApiProperty({ description: '감사 대상 엔티티' })
  entityType: string;

  @ApiProperty({ description: '엔티티 ID' })
  entityId: string;

  @ApiProperty({ description: '수행된 작업' })
  action: string;

  @ApiProperty({ description: '작업 수행자 ID' })
  performedBy: string;

  @ApiProperty({ description: '변경 전 데이터' })
  beforeData?: Record<string, any>;

  @ApiProperty({ description: '변경 후 데이터' })
  afterData?: Record<string, any>;

  @ApiProperty({ description: '수행 시간' })
  performedAt: Date;

  @ApiProperty({ description: '클라이언트 IP' })
  clientIp: string;

  @ApiProperty({ description: '사용자 에이전트' })
  userAgent?: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  metadata?: Record<string, any>;
} 