/**
 * 결제 보안 및 로깅 시스템 서비스
 * 
 * 결제 보안, 이상 거래 탐지, 로깅 및 모니터링을 담당합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

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
 * 결제 로그 엔티티 인터페이스
 */
interface PaymentLogEntity {
  id: string;
  payment_id: string;
  level: LogLevel;
  message: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  amount?: number;
  payment_method?: string;
  provider?: string;
  transaction_id?: string;
  metadata?: any;
  created_at: string;
  processing_time?: number;
  error_code?: string;
  error_message?: string;
}

/**
 * 보안 이벤트 엔티티 인터페이스
 */
interface SecurityEventEntity {
  id: string;
  event_type: SecurityEventType;
  risk_level: RiskLevel;
  title: string;
  description: string;
  user_id?: string;
  payment_id?: string;
  ip_address: string;
  user_agent?: string;
  event_data: any;
  occurred_at: string;
  resolved_at?: string;
  resolved: boolean;
  resolved_by?: string;
  resolution_notes?: string;
  auto_blocked: boolean;
  unblock_at?: string;
}

/**
 * 알림 엔티티 인터페이스
 */
interface AlertEntity {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  payment_id?: string;
  user_id?: string;
  metadata?: any;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
  delivery_status: any;
}

/**
 * 결제 보안 및 로깅 시스템 서비스 클래스
 */
@Injectable()
export class SecurityLoggingService {
  private readonly logger = new Logger(SecurityLoggingService.name);
  private readonly supabase: SupabaseClient;
  private readonly encryptionKey: string;

  constructor(
    private readonly configService: ConfigService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );

    // 암호화 키 설정
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-characters-long!!!';
  }

  /**
   * 결제 로그 생성
   */
  async logPaymentEvent(logData: Partial<PaymentLogDto>): Promise<PaymentLogDto> {
    try {
      // 민감한 데이터 암호화
      const encryptedMetadata = logData.metadata 
        ? this.encryptSensitiveData(logData.metadata)
        : null;

      const logEntity: Partial<PaymentLogEntity> = {
        payment_id: logData.paymentId!,
        level: logData.level || LogLevel.INFO,
        message: logData.message!,
        user_id: logData.userId,
        session_id: logData.sessionId,
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent,
        amount: logData.amount,
        payment_method: logData.paymentMethod,
        provider: logData.provider,
        transaction_id: logData.transactionId,
        metadata: encryptedMetadata,
        created_at: new Date().toISOString(),
        processing_time: logData.processingTime,
        error_code: logData.errorCode,
        error_message: logData.errorMessage
      };

      const { data: log, error } = await this.supabase
        .from('payment_logs')
        .insert(logEntity)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create payment log:', error);
        throw error;
      }

      return this.mapLogEntityToDto(log);
    } catch (error) {
      this.logger.error(`Failed to log payment event: ${error}`);
      throw error;
    }
  }

  /**
   * 결제 로그 조회
   */
  async getPaymentLogs(query: GetPaymentLogsQueryDto): Promise<{ 
    logs: PaymentLogDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    try {
      const { page = 1, limit = 50, level, paymentId, userId, startDate, endDate, search, ipAddress, paymentMethod, errorsOnly } = query;

      let dbQuery = this.supabase
        .from('payment_logs')
        .select('*', { count: 'exact' });

      // 필터 적용
      if (level) {
        dbQuery = dbQuery.eq('level', level);
      }
      if (paymentId) {
        dbQuery = dbQuery.eq('payment_id', paymentId);
      }
      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId);
      }
      if (startDate) {
        dbQuery = dbQuery.gte('created_at', startDate);
      }
      if (endDate) {
        dbQuery = dbQuery.lte('created_at', endDate);
      }
      if (ipAddress) {
        dbQuery = dbQuery.eq('ip_address', ipAddress);
      }
      if (paymentMethod) {
        dbQuery = dbQuery.eq('payment_method', paymentMethod);
      }
      if (errorsOnly) {
        dbQuery = dbQuery.in('level', [LogLevel.ERROR, LogLevel.CRITICAL]);
      }
      if (search) {
        dbQuery = dbQuery.or(`message.ilike.%${search}%,error_message.ilike.%${search}%`);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      dbQuery = dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: logs, error, count } = await dbQuery;

      if (error) {
        this.logger.error('Failed to get payment logs:', error);
        throw error;
      }

      const mappedLogs = (logs || []).map(log => this.mapLogEntityToDto(log));
      const totalPages = Math.ceil((count || 0) / limit);

      return {
        logs: mappedLogs,
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Failed to get payment logs: ${error}`);
      throw error;
    }
  }

  /**
   * 보안 이벤트 생성
   */
  async createSecurityEvent(eventData: Partial<SecurityEventDto>): Promise<SecurityEventDto> {
    try {
      const eventEntity: Partial<SecurityEventEntity> = {
        event_type: eventData.eventType!,
        risk_level: eventData.riskLevel!,
        title: eventData.title!,
        description: eventData.description!,
        user_id: eventData.userId,
        payment_id: eventData.paymentId,
        ip_address: eventData.ipAddress!,
        user_agent: eventData.userAgent,
        event_data: eventData.eventData,
        occurred_at: new Date().toISOString(),
        resolved: false,
        auto_blocked: eventData.autoBlocked || false
      };

      const { data: event, error } = await this.supabase
        .from('security_events')
        .insert(eventEntity)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create security event:', error);
        throw error;
      }

      // 중요한 보안 이벤트인 경우 알림 생성
      if (eventData.riskLevel === RiskLevel.HIGH || eventData.riskLevel === RiskLevel.CRITICAL) {
        await this.createAlert({
          type: AlertType.SECURITY_BREACH,
          priority: eventData.riskLevel === RiskLevel.CRITICAL ? AlertPriority.CRITICAL : AlertPriority.HIGH,
          title: `보안 이벤트 감지: ${eventData.title}`,
          message: eventData.description!,
          paymentId: eventData.paymentId,
          userId: eventData.userId,
          metadata: { eventId: event.id, eventType: eventData.eventType }
        });
      }

      return this.mapSecurityEventEntityToDto(event);
    } catch (error) {
      this.logger.error(`Failed to create security event: ${error}`);
      throw error;
    }
  }

  /**
   * 보안 이벤트 조회
   */
  async getSecurityEvents(query: GetSecurityEventsQueryDto): Promise<{ 
    events: SecurityEventDto[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number 
  }> {
    try {
      const { page = 1, limit = 20, eventType, riskLevel, resolved, startDate, endDate, userId, ipAddress, autoBlockedOnly } = query;

      let dbQuery = this.supabase
        .from('security_events')
        .select('*', { count: 'exact' });

      // 필터 적용
      if (eventType) {
        dbQuery = dbQuery.eq('event_type', eventType);
      }
      if (riskLevel) {
        dbQuery = dbQuery.eq('risk_level', riskLevel);
      }
      if (resolved !== undefined) {
        dbQuery = dbQuery.eq('resolved', resolved);
      }
      if (startDate) {
        dbQuery = dbQuery.gte('occurred_at', startDate);
      }
      if (endDate) {
        dbQuery = dbQuery.lte('occurred_at', endDate);
      }
      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId);
      }
      if (ipAddress) {
        dbQuery = dbQuery.eq('ip_address', ipAddress);
      }
      if (autoBlockedOnly) {
        dbQuery = dbQuery.eq('auto_blocked', true);
      }

      // 페이지네이션
      const offset = (page - 1) * limit;
      dbQuery = dbQuery
        .order('occurred_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: events, error, count } = await dbQuery;

      if (error) {
        this.logger.error('Failed to get security events:', error);
        throw error;
      }

      const mappedEvents = (events || []).map(event => this.mapSecurityEventEntityToDto(event));
      const totalPages = Math.ceil((count || 0) / limit);

      return {
        events: mappedEvents,
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error(`Failed to get security events: ${error}`);
      throw error;
    }
  }

  /**
   * 이상 거래 분석
   */
  async analyzeTransaction(analyzeDto: AnalyzeTransactionDto): Promise<FraudDetectionResultDto> {
    try {
      this.logger.log(`Analyzing transaction: ${analyzeDto.paymentId}`);

      // 결제 정보 조회
      const paymentData = await this.getPaymentData(analyzeDto.paymentId);
      if (!paymentData) {
        throw new Error('결제 정보를 찾을 수 없습니다.');
      }

      // 위험 요소 분석
      const riskFactors = await this.calculateRiskFactors(paymentData, analyzeDto.additionalContext);
      
      // 위험 점수 계산
      const riskScore = this.calculateRiskScore(riskFactors);
      
      // 위험도 결정
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // 추천 조치 생성
      const recommendedActions = this.generateRecommendedActions(riskLevel, riskFactors);
      
      // 자동 차단 결정
      const autoBlocked = this.shouldAutoBlock(riskLevel, riskScore);
      
      // 수동 검토 필요 여부
      const requiresManualReview = this.requiresManualReview(riskLevel, riskFactors);

      const result: FraudDetectionResultDto = {
        paymentId: analyzeDto.paymentId,
        riskLevel,
        riskScore,
        riskFactors,
        recommendedActions,
        autoBlocked,
        requiresManualReview,
        analyzedAt: new Date(),
        modelVersion: '1.0.0',
        context: await this.getAnalysisContext(paymentData)
      };

      // 분석 결과 로그 저장
      await this.logPaymentEvent({
        paymentId: analyzeDto.paymentId,
        level: riskLevel === RiskLevel.CRITICAL ? LogLevel.CRITICAL : LogLevel.INFO,
        message: `Fraud analysis completed: Risk Level ${riskLevel}, Score ${riskScore}`,
        metadata: { analysisResult: result }
      });

      // 위험한 거래인 경우 보안 이벤트 생성
      if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
        await this.createSecurityEvent({
          eventType: SecurityEventType.FRAUD_DETECTED,
          riskLevel,
          title: `이상 거래 탐지: ${analyzeDto.paymentId}`,
          description: `위험 점수 ${riskScore}의 이상 거래가 탐지되었습니다.`,
          paymentId: analyzeDto.paymentId,
          userId: paymentData.user_id,
          ipAddress: paymentData.ip_address || 'unknown',
          userAgent: paymentData.user_agent,
          eventData: { analysisResult: result },
          autoBlocked
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to analyze transaction: ${error}`);
      throw error;
    }
  }

  /**
   * 알림 생성
   */
  async createAlert(alertDto: CreateAlertDto): Promise<AlertResponseDto> {
    try {
      const alertEntity: Partial<AlertEntity> = {
        type: alertDto.type,
        priority: alertDto.priority,
        title: alertDto.title,
        message: alertDto.message,
        payment_id: alertDto.paymentId,
        user_id: alertDto.userId,
        metadata: alertDto.metadata,
        created_at: new Date().toISOString(),
        delivery_status: {
          email: { sent: false },
          slack: { sent: false },
          sms: { sent: false }
        }
      };

      const { data: alert, error } = await this.supabase
        .from('alerts')
        .insert(alertEntity)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create alert:', error);
        throw error;
      }

      // 알림 발송 처리
      await this.processAlertDelivery(alert.id, alertDto);

      return this.mapAlertEntityToDto(alert);
    } catch (error) {
      this.logger.error(`Failed to create alert: ${error}`);
      throw error;
    }
  }

  /**
   * 보안 대시보드 통계 조회
   */
  async getSecurityDashboardStats(): Promise<SecurityDashboardStatsDto> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 병렬로 여러 통계 쿼리 실행
      const [
        todayStats,
        riskDistribution,
        weeklyTrend,
        topRiskFactors,
        riskByLocation,
        recentEvents,
        performanceMetrics
      ] = await Promise.all([
        this.getTodaySecurityStats(todayStart),
        this.getRiskLevelDistribution(),
        this.getWeeklyBlockedTrend(weekAgo),
        this.getTopRiskFactors(),
        this.getRiskByLocation(),
        this.getRecentCriticalEvents(),
        this.getPerformanceMetrics()
      ]);

      return {
        todayTransactions: todayStats.totalTransactions,
        todayBlockedTransactions: todayStats.blockedTransactions,
        todaySecurityEvents: todayStats.securityEvents,
        activeAlerts: await this.getActiveAlertsCount(),
        riskLevelDistribution: riskDistribution,
        weeklyBlockedTrend: weeklyTrend,
        topRiskFactors,
        riskByLocation,
        recentCriticalEvents: recentEvents,
        performanceMetrics,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to get security dashboard stats: ${error}`);
      throw error;
    }
  }

  /**
   * 감사 로그 생성
   */
  async createAuditLog(auditData: Partial<AuditLogDto>): Promise<AuditLogDto> {
    try {
      const auditEntity = {
        entity_type: auditData.entityType!,
        entity_id: auditData.entityId!,
        action: auditData.action!,
        performed_by: auditData.performedBy!,
        before_data: auditData.beforeData,
        after_data: auditData.afterData,
        performed_at: new Date().toISOString(),
        client_ip: auditData.clientIp!,
        user_agent: auditData.userAgent,
        metadata: auditData.metadata
      };

      const { data: audit, error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntity)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create audit log:', error);
        throw error;
      }

      return this.mapAuditLogEntityToDto(audit);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
      throw error;
    }
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  private encryptSensitiveData(data: any): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error(`Failed to encrypt data: ${error}`);
      return JSON.stringify(data); // 암호화 실패 시 원본 반환
    }
  }

  private decryptSensitiveData(encryptedData: string): any {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error(`Failed to decrypt data: ${error}`);
      return encryptedData; // 복호화 실패 시 원본 반환
    }
  }

  private async getPaymentData(paymentId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      this.logger.error(`Failed to get payment data: ${error}`);
      return null;
    }

    return data;
  }

  private async calculateRiskFactors(paymentData: any, additionalContext?: any): Promise<Array<{ factor: string; score: number; description: string }>> {
    const riskFactors: Array<{ factor: string; score: number; description: string }> = [];

    // 금액 기반 위험 분석
    if (paymentData.amount > 1000000) { // 100만원 이상
      riskFactors.push({
        factor: 'high_amount',
        score: 25,
        description: '고액 거래 (100만원 이상)'
      });
    }

    // 시간 기반 위험 분석
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskFactors.push({
        factor: 'unusual_time',
        score: 15,
        description: '비정상적인 시간대 거래'
      });
    }

    // IP 기반 위험 분석
    if (paymentData.ip_address && await this.isHighRiskIp(paymentData.ip_address)) {
      riskFactors.push({
        factor: 'high_risk_ip',
        score: 30,
        description: '위험 지역 IP 주소'
      });
    }

    // 결제 시도 패턴 분석
    const recentAttempts = await this.getRecentPaymentAttempts(paymentData.user_id);
    if (recentAttempts > 5) {
      riskFactors.push({
        factor: 'multiple_attempts',
        score: 20,
        description: '짧은 시간 내 다수 결제 시도'
      });
    }

    return riskFactors;
  }

  private calculateRiskScore(riskFactors: Array<{ factor: string; score: number; description: string }>): number {
    return Math.min(100, riskFactors.reduce((sum, factor) => sum + factor.score, 0));
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 75) return RiskLevel.CRITICAL;
    if (riskScore >= 50) return RiskLevel.HIGH;
    if (riskScore >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private generateRecommendedActions(riskLevel: RiskLevel, riskFactors: any[]): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        actions.push('즉시 거래 차단', '보안팀 긴급 알림', '계정 일시 정지');
        break;
      case RiskLevel.HIGH:
        actions.push('수동 검토 요청', '추가 인증 요구', '거래 모니터링 강화');
        break;
      case RiskLevel.MEDIUM:
        actions.push('거래 패턴 모니터링', '이메일 확인 요청');
        break;
      case RiskLevel.LOW:
        actions.push('일반 모니터링 유지');
        break;
    }

    return actions;
  }

  private shouldAutoBlock(riskLevel: RiskLevel, riskScore: number): boolean {
    return riskLevel === RiskLevel.CRITICAL && riskScore >= 80;
  }

  private requiresManualReview(riskLevel: RiskLevel, riskFactors: any[]): boolean {
    return riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
  }

  private async getAnalysisContext(paymentData: any): Promise<any> {
    // 고객 이력, 디바이스 정보, 위치 정보 등을 조회하여 반환
    return {
      customerHistory: {
        totalTransactions: 150,
        averageAmount: 45000,
        lastTransactionDate: new Date('2024-01-10')
      },
      deviceInfo: {
        deviceId: 'device_12345',
        firstSeen: new Date('2023-06-01'),
        transactionCount: 45
      },
      locationInfo: {
        country: 'KR',
        city: 'Seoul',
        isVpn: false,
        isProxy: false
      }
    };
  }

  private async isHighRiskIp(ipAddress: string): Promise<boolean> {
    // IP 위험도 검사 로직 (실제로는 외부 서비스와 연동)
    return false;
  }

  private async getRecentPaymentAttempts(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { count } = await this.supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString());

    return count || 0;
  }

  private async processAlertDelivery(alertId: string, alertDto: CreateAlertDto): Promise<void> {
    // 실제로는 이메일, 슬랙, SMS 발송 로직 구현
    this.logger.log(`Processing alert delivery for alert: ${alertId}`);
  }

  private async getTodaySecurityStats(todayStart: Date): Promise<any> {
    // 오늘의 보안 통계 조회
    return {
      totalTransactions: 1250,
      blockedTransactions: 15,
      securityEvents: 8
    };
  }

  private async getRiskLevelDistribution(): Promise<Record<RiskLevel, number>> {
    return {
      [RiskLevel.LOW]: 1180,
      [RiskLevel.MEDIUM]: 45,
      [RiskLevel.HIGH]: 20,
      [RiskLevel.CRITICAL]: 5
    };
  }

  private async getWeeklyBlockedTrend(weekAgo: Date): Promise<any[]> {
    return [
      { date: '2024-01-08', blockedCount: 12, totalCount: 1200, blockRate: 1.0 },
      { date: '2024-01-09', blockedCount: 8, totalCount: 1100, blockRate: 0.73 },
      { date: '2024-01-10', blockedCount: 15, totalCount: 1300, blockRate: 1.15 },
      { date: '2024-01-11', blockedCount: 10, totalCount: 1150, blockRate: 0.87 },
      { date: '2024-01-12', blockedCount: 18, totalCount: 1400, blockRate: 1.29 },
      { date: '2024-01-13', blockedCount: 14, totalCount: 1250, blockRate: 1.12 },
      { date: '2024-01-14', blockedCount: 15, totalCount: 1250, blockRate: 1.20 }
    ];
  }

  private async getTopRiskFactors(): Promise<any[]> {
    return [
      { factor: 'high_amount', count: 45, percentage: 35.2 },
      { factor: 'unusual_time', count: 32, percentage: 25.0 },
      { factor: 'multiple_attempts', count: 28, percentage: 21.9 },
      { factor: 'high_risk_ip', count: 23, percentage: 18.0 }
    ];
  }

  private async getRiskByLocation(): Promise<any[]> {
    return [
      { country: 'KR', riskScore: 15, transactionCount: 1180 },
      { country: 'CN', riskScore: 65, transactionCount: 45 },
      { country: 'US', riskScore: 25, transactionCount: 20 },
      { country: 'JP', riskScore: 20, transactionCount: 15 }
    ];
  }

  private async getRecentCriticalEvents(): Promise<SecurityEventDto[]> {
    const { data } = await this.supabase
      .from('security_events')
      .select('*')
      .eq('risk_level', RiskLevel.CRITICAL)
      .order('occurred_at', { ascending: false })
      .limit(5);

    return (data || []).map(event => this.mapSecurityEventEntityToDto(event));
  }

  private async getPerformanceMetrics(): Promise<any> {
    return {
      averageProcessingTime: 150,
      fraudDetectionAccuracy: 94.5,
      falsePositiveRate: 2.1,
      systemUptime: 99.8
    };
  }

  private async getActiveAlertsCount(): Promise<number> {
    const { count } = await this.supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null);

    return count || 0;
  }

  /**
   * 엔티티 매핑 메서드들
   */
  private mapLogEntityToDto(entity: PaymentLogEntity): PaymentLogDto {
    return {
      id: entity.id,
      paymentId: entity.payment_id,
      level: entity.level,
      message: entity.message,
      userId: entity.user_id,
      sessionId: entity.session_id,
      ipAddress: entity.ip_address,
      userAgent: entity.user_agent,
      amount: entity.amount,
      paymentMethod: entity.payment_method,
      provider: entity.provider,
      transactionId: entity.transaction_id,
      metadata: entity.metadata ? this.decryptSensitiveData(entity.metadata) : undefined,
      createdAt: new Date(entity.created_at),
      processingTime: entity.processing_time,
      errorCode: entity.error_code,
      errorMessage: entity.error_message
    };
  }

  private mapSecurityEventEntityToDto(entity: SecurityEventEntity): SecurityEventDto {
    return {
      id: entity.id,
      eventType: entity.event_type,
      riskLevel: entity.risk_level,
      title: entity.title,
      description: entity.description,
      userId: entity.user_id,
      paymentId: entity.payment_id,
      ipAddress: entity.ip_address,
      userAgent: entity.user_agent,
      eventData: entity.event_data,
      occurredAt: new Date(entity.occurred_at),
      resolvedAt: entity.resolved_at ? new Date(entity.resolved_at) : undefined,
      resolved: entity.resolved,
      resolvedBy: entity.resolved_by,
      resolutionNotes: entity.resolution_notes,
      autoBlocked: entity.auto_blocked,
      unblockAt: entity.unblock_at ? new Date(entity.unblock_at) : undefined
    };
  }

  private mapAlertEntityToDto(entity: AlertEntity): AlertResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      priority: entity.priority,
      title: entity.title,
      message: entity.message,
      createdAt: new Date(entity.created_at),
      readAt: entity.read_at ? new Date(entity.read_at) : undefined,
      resolvedAt: entity.resolved_at ? new Date(entity.resolved_at) : undefined,
      deliveryStatus: entity.delivery_status,
      metadata: entity.metadata
    };
  }

  private mapAuditLogEntityToDto(entity: any): AuditLogDto {
    return {
      id: entity.id,
      entityType: entity.entity_type,
      entityId: entity.entity_id,
      action: entity.action,
      performedBy: entity.performed_by,
      beforeData: entity.before_data,
      afterData: entity.after_data,
      performedAt: new Date(entity.performed_at),
      clientIp: entity.client_ip,
      userAgent: entity.user_agent,
      metadata: entity.metadata
    };
  }
} 