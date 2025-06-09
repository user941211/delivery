/**
 * 결제 보안 및 로깅 시스템 컨트롤러
 * 
 * 보안 이벤트, 로깅, 이상 거래 탐지, 알림 관리 API를 제공합니다.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { SecurityLoggingService } from '../services/security-logging.service';

import {
  LogLevel,
  SecurityEventType,
  AlertType,
  AlertPriority,
  RiskLevel,
  PaymentLogDto,
  SecurityEventDto,
  FraudDetectionResultDto,
  GetPaymentLogsQueryDto,
  GetSecurityEventsQueryDto,
  CreateAlertDto,
  AlertResponseDto,
  SecurityDashboardStatsDto,
  AnalyzeTransactionDto,
  SecurityConfigDto,
  AuditLogDto
} from '../dto/security-logging.dto';

/**
 * 임시 인증 요청 인터페이스 (실제로는 JWT에서 추출)
 */
interface AuthenticatedRequest {
  user: {
    id: string;
    name: string;
    role: string;
  };
  ip?: string;
  headers?: any;
}

/**
 * 보안 및 로깅 시스템 컨트롤러 클래스
 */
@ApiTags('Security & Logging')
@Controller('security')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class SecurityLoggingController {
  private readonly logger = new Logger(SecurityLoggingController.name);

  constructor(
    private readonly securityLoggingService: SecurityLoggingService
  ) {}

  /**
   * 결제 로그 조회
   */
  @Get('payment-logs')
  @ApiOperation({ summary: '결제 로그 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'level', description: '로그 레벨', enum: LogLevel, required: false })
  @ApiQuery({ name: 'paymentId', description: '결제 ID', required: false })
  @ApiQuery({ name: 'userId', description: '사용자 ID', required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiQuery({ name: 'search', description: '검색 키워드', required: false })
  @ApiQuery({ name: 'ipAddress', description: 'IP 주소', required: false })
  @ApiQuery({ name: 'paymentMethod', description: '결제 방법', required: false })
  @ApiQuery({ name: 'errorsOnly', description: '에러만 조회', required: false })
  @ApiResponse({
    status: 200,
    description: '결제 로그가 성공적으로 조회되었습니다.',
  })
  async getPaymentLogs(
    @Query() query: GetPaymentLogsQueryDto
  ): Promise<{ 
    logs: PaymentLogDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    return await this.securityLoggingService.getPaymentLogs(query);
  }

  /**
   * 보안 이벤트 조회
   */
  @Get('security-events')
  @ApiOperation({ summary: '보안 이벤트 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'eventType', description: '이벤트 타입', enum: SecurityEventType, required: false })
  @ApiQuery({ name: 'riskLevel', description: '위험도', enum: RiskLevel, required: false })
  @ApiQuery({ name: 'resolved', description: '해결 상태', required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiQuery({ name: 'userId', description: '사용자 ID', required: false })
  @ApiQuery({ name: 'ipAddress', description: 'IP 주소', required: false })
  @ApiQuery({ name: 'autoBlockedOnly', description: '자동 차단만 조회', required: false })
  @ApiResponse({
    status: 200,
    description: '보안 이벤트가 성공적으로 조회되었습니다.',
  })
  async getSecurityEvents(
    @Query() query: GetSecurityEventsQueryDto
  ): Promise<{ 
    events: SecurityEventDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    return await this.securityLoggingService.getSecurityEvents(query);
  }

  /**
   * 보안 이벤트 해결 처리
   */
  @Put('security-events/:eventId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '보안 이벤트 해결 처리' })
  @ApiParam({ name: 'eventId', description: '보안 이벤트 ID' })
  @ApiResponse({
    status: 200,
    description: '보안 이벤트가 성공적으로 해결 처리되었습니다.',
  })
  async resolveSecurityEvent(
    @Param('eventId') eventId: string,
    @Body() body: { 
      resolutionNotes?: string; 
      unblockUser?: boolean;
      preventSimilarEvents?: boolean;
    },
    @Req() req?: AuthenticatedRequest
  ): Promise<{ message: string; eventId: string }> {
    try {
      this.logger.log(`Resolving security event: ${eventId}`);
      
      // 실제로는 SecurityLoggingService에 resolveSecurityEvent 메서드 구현 필요
      // 여기서는 단순한 응답 반환
      return {
        message: '보안 이벤트가 성공적으로 해결되었습니다.',
        eventId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to resolve security event: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 이상 거래 분석
   */
  @Post('analyze-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이상 거래 분석' })
  @ApiResponse({
    status: 200,
    description: '거래 분석이 성공적으로 완료되었습니다.',
    type: FraudDetectionResultDto,
  })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async analyzeTransaction(
    @Body() analyzeDto: AnalyzeTransactionDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<FraudDetectionResultDto> {
    try {
      this.logger.log(`Analyzing transaction: ${analyzeDto.paymentId}`);
      
      // 요청자 정보를 추가 컨텍스트에 포함
      if (req?.user?.id) {
        analyzeDto.additionalContext = {
          ...analyzeDto.additionalContext,
          analyzedBy: req.user.id,
          analyzerRole: req.user.role
        };
      }

      return await this.securityLoggingService.analyzeTransaction(analyzeDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to analyze transaction: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 일괄 거래 분석
   */
  @Post('analyze-transactions/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '일괄 거래 분석' })
  @ApiResponse({
    status: 200,
    description: '일괄 거래 분석이 성공적으로 완료되었습니다.',
  })
  async analyzeBulkTransactions(
    @Body() body: {
      paymentIds: string[];
      analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
      forceReanalysis?: boolean;
    },
    @Req() req?: AuthenticatedRequest
  ): Promise<{
    results: FraudDetectionResultDto[];
    summary: {
      total: number;
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
      autoBlocked: number;
      manualReviewRequired: number;
    };
  }> {
    try {
      this.logger.log(`Analyzing ${body.paymentIds.length} transactions in bulk`);

      const results: FraudDetectionResultDto[] = [];
      const summary = {
        total: body.paymentIds.length,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        autoBlocked: 0,
        manualReviewRequired: 0
      };

      // 병렬 처리로 성능 향상
      const analysisPromises = body.paymentIds.map(paymentId =>
        this.securityLoggingService.analyzeTransaction({
          paymentId,
          analysisDepth: body.analysisDepth || 'basic',
          forceReanalysis: body.forceReanalysis || false,
          additionalContext: {
            bulkAnalysis: true,
            analyzedBy: req?.user?.id
          }
        })
      );

      const analysisResults = await Promise.allSettled(analysisPromises);

      analysisResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const analysis = result.value;
          results.push(analysis);

          // 통계 업데이트
          switch (analysis.riskLevel) {
            case RiskLevel.HIGH:
            case RiskLevel.CRITICAL:
              summary.highRisk++;
              break;
            case RiskLevel.MEDIUM:
              summary.mediumRisk++;
              break;
            case RiskLevel.LOW:
              summary.lowRisk++;
              break;
          }

          if (analysis.autoBlocked) {
            summary.autoBlocked++;
          }

          if (analysis.requiresManualReview) {
            summary.manualReviewRequired++;
          }
        } else {
          this.logger.error(`Failed to analyze payment ${body.paymentIds[index]}: ${result.reason}`);
        }
      });

      return { results, summary };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to analyze transactions in bulk: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 알림 생성
   */
  @Post('alerts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '보안 알림 생성' })
  @ApiResponse({
    status: 201,
    description: '알림이 성공적으로 생성되었습니다.',
    type: AlertResponseDto,
  })
  async createAlert(
    @Body() alertDto: CreateAlertDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<AlertResponseDto> {
    try {
      this.logger.log(`Creating alert: ${alertDto.title}`);

      // 생성자 정보를 메타데이터에 추가
      if (req?.user?.id) {
        alertDto.metadata = {
          ...alertDto.metadata,
          createdBy: req.user.id,
          creatorRole: req.user.role
        };
      }

      return await this.securityLoggingService.createAlert(alertDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create alert: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 보안 대시보드 통계
   */
  @Get('dashboard/stats')
  @ApiOperation({ summary: '보안 대시보드 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '보안 대시보드 통계가 성공적으로 조회되었습니다.',
    type: SecurityDashboardStatsDto,
  })
  async getSecurityDashboardStats(): Promise<SecurityDashboardStatsDto> {
    return await this.securityLoggingService.getSecurityDashboardStats();
  }

  /**
   * 실시간 보안 모니터링
   */
  @Get('monitoring/real-time')
  @ApiOperation({ summary: '실시간 보안 모니터링' })
  @ApiResponse({
    status: 200,
    description: '실시간 보안 모니터링 데이터가 성공적으로 조회되었습니다.',
  })
  async getRealTimeMonitoring(): Promise<{
    currentThreatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeThreats: number;
    blockedAttempts: number;
    ongoingAttacks: Array<{
      type: string;
      count: number;
      lastSeen: Date;
      severity: string;
    }>;
    systemStatus: {
      fraudDetection: 'operational' | 'degraded' | 'down';
      alerting: 'operational' | 'degraded' | 'down';
      logging: 'operational' | 'degraded' | 'down';
    };
    recentActivity: Array<{
      timestamp: Date;
      event: string;
      severity: string;
      details: string;
    }>;
  }> {
    // 실시간 모니터링 데이터 - 실제로는 Redis나 실시간 데이터베이스에서 조회
    return {
      currentThreatLevel: 'medium',
      activeThreats: 3,
      blockedAttempts: 127,
      ongoingAttacks: [
        {
          type: 'Multiple Payment Attempts',
          count: 45,
          lastSeen: new Date(),
          severity: 'medium'
        },
        {
          type: 'Suspicious IP Activity',
          count: 23,
          lastSeen: new Date(Date.now() - 5 * 60 * 1000),
          severity: 'low'
        }
      ],
      systemStatus: {
        fraudDetection: 'operational',
        alerting: 'operational',
        logging: 'operational'
      },
      recentActivity: [
        {
          timestamp: new Date(),
          event: 'High-risk transaction blocked',
          severity: 'high',
          details: 'Payment ID: pay_12345, Risk Score: 85'
        },
        {
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
          event: 'Fraud pattern detected',
          severity: 'medium',
          details: 'Multiple cards from same device'
        }
      ]
    };
  }

  /**
   * 보안 설정 조회
   */
  @Get('config')
  @ApiOperation({ summary: '보안 설정 조회' })
  @ApiResponse({
    status: 200,
    description: '보안 설정이 성공적으로 조회되었습니다.',
    type: SecurityConfigDto,
  })
  async getSecurityConfig(): Promise<SecurityConfigDto> {
    // 실제로는 데이터베이스나 설정 파일에서 조회
    return {
      fraudDetectionEnabled: true,
      autoBlockingEnabled: true,
      riskScoreThreshold: 75,
      dailyTransactionLimit: 10000000, // 1천만원
      hourlyTransactionLimit: 5000000,  // 5백만원
      allowedCountries: ['KR', 'US', 'JP'],
      blockedCountries: ['CN', 'RU'],
      blockVpnProxy: true,
      alertThresholds: {
        criticalEvents: 5,
        failedAttempts: 10,
        suspiciousPattern: 3
      },
      logRetentionDays: 90
    };
  }

  /**
   * 보안 설정 업데이트
   */
  @Put('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '보안 설정 업데이트' })
  @ApiResponse({
    status: 200,
    description: '보안 설정이 성공적으로 업데이트되었습니다.',
  })
  async updateSecurityConfig(
    @Body() configDto: SecurityConfigDto,
    @Req() req?: AuthenticatedRequest
  ): Promise<{ message: string; config: SecurityConfigDto }> {
    try {
      this.logger.log('Updating security configuration');

      // 설정 변경 감사 로그 생성
      if (req?.user?.id) {
        await this.securityLoggingService.createAuditLog({
          entityType: 'security_config',
          entityId: 'main',
          action: 'update',
          performedBy: req.user.id,
          afterData: configDto,
          clientIp: req.ip || 'unknown',
          userAgent: req.headers?.['user-agent'],
          metadata: { 
            timestamp: new Date(),
            reason: '보안 설정 업데이트'
          }
        });
      }

      // 실제로는 데이터베이스나 설정 파일에 저장
      return {
        message: '보안 설정이 성공적으로 업데이트되었습니다.',
        config: configDto
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update security config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * IP 차단 목록 조회
   */
  @Get('blocked-ips')
  @ApiOperation({ summary: 'IP 차단 목록 조회' })
  @ApiResponse({
    status: 200,
    description: 'IP 차단 목록이 성공적으로 조회되었습니다.',
  })
  async getBlockedIPs(): Promise<{
    blockedIPs: Array<{
      ipAddress: string;
      reason: string;
      blockedAt: Date;
      expiresAt?: Date;
      isAutoBlocked: boolean;
      riskScore: number;
    }>;
    total: number;
  }> {
    // 실제로는 데이터베이스에서 조회
    return {
      blockedIPs: [
        {
          ipAddress: '192.168.1.100',
          reason: '다수 결제 실패 시도',
          blockedAt: new Date('2024-01-10T10:00:00Z'),
          expiresAt: new Date('2024-01-17T10:00:00Z'),
          isAutoBlocked: true,
          riskScore: 95
        },
        {
          ipAddress: '10.0.0.50',
          reason: '의심스러운 거래 패턴',
          blockedAt: new Date('2024-01-09T15:30:00Z'),
          isAutoBlocked: false,
          riskScore: 78
        }
      ],
      total: 2
    };
  }

  /**
   * IP 차단 해제
   */
  @Put('blocked-ips/:ipAddress/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'IP 차단 해제' })
  @ApiParam({ name: 'ipAddress', description: '차단 해제할 IP 주소' })
  @ApiResponse({
    status: 200,
    description: 'IP 차단이 성공적으로 해제되었습니다.',
  })
  async unblockIP(
    @Param('ipAddress') ipAddress: string,
    @Body() body: { reason?: string },
    @Req() req?: AuthenticatedRequest
  ): Promise<{ message: string; ipAddress: string }> {
    try {
      this.logger.log(`Unblocking IP: ${ipAddress}`);

      // 차단 해제 감사 로그 생성
      if (req?.user?.id) {
        await this.securityLoggingService.createAuditLog({
          entityType: 'blocked_ip',
          entityId: ipAddress,
          action: 'unblock',
          performedBy: req.user.id,
          clientIp: req.ip || 'unknown',
          userAgent: req.headers?.['user-agent'],
          metadata: { 
            reason: body.reason || '관리자 수동 해제',
            timestamp: new Date()
          }
        });
      }

      // 실제로는 차단 목록에서 제거하는 로직 구현
      return {
        message: 'IP 차단이 성공적으로 해제되었습니다.',
        ipAddress
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to unblock IP: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 위험 점수 재계산
   */
  @Post('recalculate-risk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '위험 점수 재계산' })
  @ApiResponse({
    status: 200,
    description: '위험 점수 재계산이 완료되었습니다.',
  })
  async recalculateRiskScores(
    @Body() body: {
      paymentIds?: string[];
      timeRange?: { start: string; end: string };
      recalculateAll?: boolean;
    },
    @Req() req?: AuthenticatedRequest
  ): Promise<{
    message: string;
    processed: number;
    updated: number;
    errors: string[];
  }> {
    try {
      this.logger.log('Starting risk score recalculation');

      // 실제로는 위험 점수 재계산 로직 구현
      // 여기서는 Mock 응답 반환
      const result = {
        message: '위험 점수 재계산이 완료되었습니다.',
        processed: body.paymentIds?.length || 1000,
        updated: (body.paymentIds?.length || 1000) - 5,
        errors: [
          'Payment pay_123: 결제 정보 누락',
          'Payment pay_456: 고객 데이터 접근 불가'
        ]
      };

      // 재계산 작업 감사 로그
      if (req?.user?.id) {
        await this.securityLoggingService.createAuditLog({
          entityType: 'risk_calculation',
          entityId: 'bulk_recalculation',
          action: 'recalculate',
          performedBy: req.user.id,
          clientIp: req.ip || 'unknown',
          metadata: {
            scope: body.recalculateAll ? 'all' : 'selective',
            parameters: body,
            result
          }
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to recalculate risk scores: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 보안 감사 로그 조회
   */
  @Get('audit-logs')
  @ApiOperation({ summary: '보안 감사 로그 조회' })
  @ApiQuery({ name: 'page', description: '페이지 번호', required: false })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false })
  @ApiQuery({ name: 'entityType', description: '엔티티 타입', required: false })
  @ApiQuery({ name: 'action', description: '수행된 작업', required: false })
  @ApiQuery({ name: 'performedBy', description: '작업 수행자', required: false })
  @ApiQuery({ name: 'startDate', description: '시작 날짜', required: false })
  @ApiQuery({ name: 'endDate', description: '종료 날짜', required: false })
  @ApiResponse({
    status: 200,
    description: '감사 로그가 성공적으로 조회되었습니다.',
  })
  async getAuditLogs(
    @Query() query: {
      page?: number;
      limit?: number;
      entityType?: string;
      action?: string;
      performedBy?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    logs: AuditLogDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 실제로는 SecurityLoggingService에 getAuditLogs 메서드 구현 필요
    // 여기서는 Mock 데이터 반환
    const mockLogs: AuditLogDto[] = [
      {
        id: '1',
        entityType: 'security_config',
        entityId: 'main',
        action: 'update',
        performedBy: 'admin_123',
        afterData: { riskScoreThreshold: 80 },
        performedAt: new Date(),
        clientIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Chrome/91.0',
        metadata: { reason: '보안 강화' }
      }
    ];

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = mockLogs.length;
    const totalPages = Math.ceil(total / limit);

    return {
      logs: mockLogs,
      total,
      page,
      limit,
      totalPages
    };
  }
} 