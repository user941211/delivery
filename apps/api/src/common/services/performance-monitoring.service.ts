/**
 * 성능 모니터링 서비스
 * 
 * 실시간 성능 지표 수집, 모니터링 대시보드, 
 * 임계값 기반 알람 시스템을 제공합니다.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 성능 메트릭 타입
 */
export interface PerformanceMetric {
  timestamp: Date;
  metricType: MetricType;
  value: number;
  unit: string;
  tags: Record<string, string>;
  endpoint?: string;
  userId?: string;
  requestId?: string;
}

/**
 * 메트릭 타입 열거형
 */
export enum MetricType {
  RESPONSE_TIME = 'response_time',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DATABASE_QUERY_TIME = 'db_query_time',
  CACHE_HIT_RATE = 'cache_hit_rate',
  CONCURRENT_USERS = 'concurrent_users',
  QUEUE_SIZE = 'queue_size',
  BUSINESS_METRIC = 'business_metric'
}

/**
 * 알람 규칙
 */
export interface AlertRule {
  id: string;
  name: string;
  metricType: MetricType;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // 지속 시간 (초)
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // 알람 채널 (email, slack, webhook 등)
  cooldown: number; // 알람 재발송 방지 시간 (초)
  tags?: Record<string, string>;
}

/**
 * 알람 이벤트
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  metric: PerformanceMetric;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * 성능 통계
 */
export interface PerformanceStats {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  endpoints: Array<{
    path: string;
    method: string;
    averageResponseTime: number;
    requestCount: number;
    errorCount: number;
  }>;
  alerts: {
    total: number;
    critical: number;
    resolved: number;
  };
}

@Injectable()
export class PerformanceMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  
  // 메트릭 저장소 (실제 환경에서는 Time Series DB 사용)
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  
  // 알람 규칙
  private alertRules: Map<string, AlertRule> = new Map();
  
  // 활성 알람
  private activeAlerts: Map<string, AlertEvent> = new Map();
  
  // 마지막 알람 발송 시간 (쿨다운 관리)
  private lastAlertTime: Map<string, Date> = new Map();
  
  // 모니터링 인터벌
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // 시스템 메트릭 수집 인터벌
  private systemMetricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Performance Monitoring Service');
    
    // 기본 알람 규칙 설정
    this.setupDefaultAlertRules();
    
    // 모니터링 시작
    this.startMonitoring();
    
    // 시스템 메트릭 수집 시작
    this.startSystemMetricsCollection();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Performance Monitoring Service');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
  }

  /**
   * 성능 메트릭 기록
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    // 메트릭 저장
    const key = `${metric.metricType}_${JSON.stringify(metric.tags)}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricList = this.metrics.get(key)!;
    metricList.push(fullMetric);
    
    // 오래된 메트릭 정리 (메모리 관리)
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    const cutoff = new Date(Date.now() - maxAge);
    const filteredMetrics = metricList.filter(m => m.timestamp > cutoff);
    this.metrics.set(key, filteredMetrics);

    // 알람 규칙 확인
    this.checkAlertRules(fullMetric);
    
    // 메트릭 이벤트 발송
    this.eventEmitter.emit('metric.recorded', fullMetric);
  }

  /**
   * 응답 시간 기록
   */
  recordResponseTime(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    requestId?: string
  ): void {
    this.recordMetric({
      metricType: MetricType.RESPONSE_TIME,
      value: responseTime,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        status_group: Math.floor(statusCode / 100) + 'xx'
      },
      endpoint,
      userId,
      requestId
    });

    // 에러율 계산용
    if (statusCode >= 400) {
      this.recordMetric({
        metricType: MetricType.ERROR_RATE,
        value: 1,
        unit: 'count',
        tags: {
          endpoint,
          method,
          status_code: statusCode.toString()
        },
        endpoint,
        userId,
        requestId
      });
    }
  }

  /**
   * 처리량 기록
   */
  recordThroughput(endpoint: string, method: string): void {
    this.recordMetric({
      metricType: MetricType.THROUGHPUT,
      value: 1,
      unit: 'requests',
      tags: {
        endpoint,
        method
      },
      endpoint
    });
  }

  /**
   * 비즈니스 메트릭 기록
   */
  recordBusinessMetric(
    metricName: string,
    value: number,
    unit: string,
    tags: Record<string, string> = {}
  ): void {
    this.recordMetric({
      metricType: MetricType.BUSINESS_METRIC,
      value,
      unit,
      tags: {
        metric_name: metricName,
        ...tags
      }
    });
  }

  /**
   * 알람 규칙 추가/수정
   */
  setAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.log(`Alert rule set: ${rule.name}`);
  }

  /**
   * 알람 규칙 제거
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.logger.log(`Alert rule removed: ${ruleId}`);
  }

  /**
   * 성능 통계 조회
   */
  async getPerformanceStats(
    startTime: Date,
    endTime: Date
  ): Promise<PerformanceStats> {
    const responseTimeMetrics = this.getMetricsByType(
      MetricType.RESPONSE_TIME,
      startTime,
      endTime
    );
    
    const throughputMetrics = this.getMetricsByType(
      MetricType.THROUGHPUT,
      startTime,
      endTime
    );
    
    const errorMetrics = this.getMetricsByType(
      MetricType.ERROR_RATE,
      startTime,
      endTime
    );

    // 응답 시간 통계 계산
    const responseTimes = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    // 처리량 계산 (분당 요청 수)
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const throughput = throughputMetrics.length / durationMinutes;

    // 에러율 계산
    const totalRequests = throughputMetrics.length;
    const errorRequests = errorMetrics.length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // 엔드포인트별 통계
    const endpointStats = this.calculateEndpointStats(
      responseTimeMetrics,
      throughputMetrics,
      errorMetrics
    );

    // 알람 통계
    const alertStats = this.calculateAlertStats(startTime, endTime);

    return {
      period: { start: startTime, end: endTime },
      metrics: {
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        throughput,
        errorRate,
        uptime: this.calculateUptime(startTime, endTime)
      },
      endpoints: endpointStats,
      alerts: alertStats
    };
  }

  /**
   * 실시간 메트릭 조회
   */
  getRealTimeMetrics(): {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeAlerts: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recentResponseTimes = this.getMetricsByType(
      MetricType.RESPONSE_TIME,
      fiveMinutesAgo,
      now
    );

    const recentThroughput = this.getMetricsByType(
      MetricType.THROUGHPUT,
      fiveMinutesAgo,
      now
    );

    const recentErrors = this.getMetricsByType(
      MetricType.ERROR_RATE,
      fiveMinutesAgo,
      now
    );

    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, m) => sum + m.value, 0) / recentResponseTimes.length
      : 0;

    const throughputPerMinute = recentThroughput.length / 5; // 5분간 평균
    const errorRate = recentThroughput.length > 0 
      ? (recentErrors.length / recentThroughput.length) * 100 
      : 0;

    const activeAlertsCount = this.activeAlerts.size;

    // 시스템 건강 상태 판단
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlertsCount > 0 || errorRate > 5 || avgResponseTime > 1000) {
      systemHealth = 'warning';
    }
    if (activeAlertsCount > 5 || errorRate > 20 || avgResponseTime > 5000) {
      systemHealth = 'critical';
    }

    return {
      responseTime: avgResponseTime,
      throughput: throughputPerMinute,
      errorRate,
      activeAlerts: activeAlertsCount,
      systemHealth
    };
  }

  /**
   * 성능 대시보드 데이터 생성
   */
  async generateDashboardData(): Promise<{
    overview: any;
    charts: any[];
    alerts: AlertEvent[];
    recommendations: string[];
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const stats = await this.getPerformanceStats(oneHourAgo, now);
    const realTime = this.getRealTimeMetrics();
    
    // 차트 데이터 생성
    const charts = [
      this.generateResponseTimeChart(oneHourAgo, now),
      this.generateThroughputChart(oneHourAgo, now),
      this.generateErrorRateChart(oneHourAgo, now),
      this.generateEndpointPerformanceChart()
    ];

    // 성능 권장사항 생성
    const recommendations = this.generatePerformanceRecommendations(stats, realTime);

    return {
      overview: {
        ...realTime,
        ...stats.metrics,
        period: stats.period
      },
      charts,
      alerts: Array.from(this.activeAlerts.values()),
      recommendations
    };
  }

  /**
   * 기본 알람 규칙 설정
   */
  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_response_time',
        name: 'High Response Time',
        metricType: MetricType.RESPONSE_TIME,
        condition: 'gt',
        threshold: 1000, // 1초
        duration: 300, // 5분
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        cooldown: 900 // 15분
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metricType: MetricType.ERROR_RATE,
        condition: 'gt',
        threshold: 10, // 10%
        duration: 180, // 3분
        severity: 'critical',
        enabled: true,
        channels: ['email', 'slack', 'webhook'],
        cooldown: 600 // 10분
      },
      {
        id: 'low_throughput',
        name: 'Low Throughput',
        metricType: MetricType.THROUGHPUT,
        condition: 'lt',
        threshold: 1, // 분당 1건 미만
        duration: 600, // 10분
        severity: 'medium',
        enabled: true,
        channels: ['slack'],
        cooldown: 1800 // 30분
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metricType: MetricType.MEMORY_USAGE,
        condition: 'gt',
        threshold: 80, // 80%
        duration: 300, // 5분
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        cooldown: 900 // 15분
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    this.logger.log(`Set up ${defaultRules.length} default alert rules`);
  }

  /**
   * 모니터링 시작
   */
  private startMonitoring(): void {
    const intervalMs = this.configService.get<number>('MONITORING_INTERVAL', 60000); // 1분
    
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
      this.cleanupOldAlerts();
    }, intervalMs);

    this.logger.log(`Monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * 시스템 메트릭 수집 시작
   */
  private startSystemMetricsCollection(): void {
    const intervalMs = 30000; // 30초
    
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    this.logger.log('System metrics collection started');
  }

  /**
   * 시스템 메트릭 수집
   */
  private collectSystemMetrics(): void {
    try {
      // 메모리 사용량
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      this.recordMetric({
        metricType: MetricType.MEMORY_USAGE,
        value: memoryUsagePercent,
        unit: 'percent',
        tags: { component: 'nodejs' }
      });

      // CPU 사용량 (간단한 추정)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // 마이크로초를 초로 변환
      
      this.recordMetric({
        metricType: MetricType.CPU_USAGE,
        value: cpuPercent,
        unit: 'percent',
        tags: { component: 'nodejs' }
      });

    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * 건강 상태 확인
   */
  private performHealthCheck(): void {
    const realTimeMetrics = this.getRealTimeMetrics();
    
    // 시스템 건강 상태 로깅
    this.logger.debug('Health check:', {
      systemHealth: realTimeMetrics.systemHealth,
      responseTime: realTimeMetrics.responseTime,
      errorRate: realTimeMetrics.errorRate,
      activeAlerts: realTimeMetrics.activeAlerts
    });

    // 건강 상태 이벤트 발송
    this.eventEmitter.emit('health.check', realTimeMetrics);
  }

  /**
   * 알람 규칙 확인
   */
  private checkAlertRules(metric: PerformanceMetric): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metricType !== metric.metricType) {
        continue;
      }

      // 태그 매칭 확인
      if (rule.tags && !this.tagsMatch(rule.tags, metric.tags)) {
        continue;
      }

      // 임계값 확인
      const isTriggered = this.evaluateCondition(
        metric.value,
        rule.condition,
        rule.threshold
      );

      if (isTriggered) {
        this.handleAlertTrigger(rule, metric);
      }
    }
  }

  /**
   * 알람 발생 처리
   */
  private handleAlertTrigger(rule: AlertRule, metric: PerformanceMetric): void {
    const alertId = `${rule.id}_${Date.now()}`;
    
    // 쿨다운 확인
    const lastAlert = this.lastAlertTime.get(rule.id);
    if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldown * 1000) {
      return; // 쿨다운 기간 중
    }

    const alertEvent: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${metric.value}${metric.unit} ${rule.condition} ${rule.threshold}${metric.unit}`,
      metric,
      triggeredAt: new Date(),
      resolved: false
    };

    this.activeAlerts.set(alertId, alertEvent);
    this.lastAlertTime.set(rule.id, new Date());

    // 알람 이벤트 발송
    this.eventEmitter.emit('alert.triggered', alertEvent);
    
    // 알람 채널로 전송
    this.sendAlert(alertEvent, rule.channels);

    this.logger.warn(`Alert triggered: ${rule.name}`, {
      alertId,
      metric: metric.value,
      threshold: rule.threshold
    });
  }

  /**
   * 알람 전송
   */
  private async sendAlert(alert: AlertEvent, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }

  /**
   * 이메일 알람 전송 (구현 예시)
   */
  private async sendEmailAlert(alert: AlertEvent): Promise<void> {
    // 실제 구현에서는 이메일 서비스 사용
    this.logger.log(`Email alert would be sent: ${alert.message}`);
  }

  /**
   * Slack 알람 전송 (구현 예시)
   */
  private async sendSlackAlert(alert: AlertEvent): Promise<void> {
    // 실제 구현에서는 Slack API 사용
    this.logger.log(`Slack alert would be sent: ${alert.message}`);
  }

  /**
   * 웹훅 알람 전송 (구현 예시)
   */
  private async sendWebhookAlert(alert: AlertEvent): Promise<void> {
    // 실제 구현에서는 HTTP POST 요청
    this.logger.log(`Webhook alert would be sent: ${alert.message}`);
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * 태그 매칭 확인
   */
  private tagsMatch(
    ruleTags: Record<string, string>,
    metricTags: Record<string, string>
  ): boolean {
    for (const [key, value] of Object.entries(ruleTags)) {
      if (metricTags[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 타입별 메트릭 조회
   */
  private getMetricsByType(
    type: MetricType,
    startTime: Date,
    endTime: Date
  ): PerformanceMetric[] {
    const result: PerformanceMetric[] = [];
    
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(type)) {
        const filteredMetrics = metrics.filter(
          m => m.timestamp >= startTime && m.timestamp <= endTime
        );
        result.push(...filteredMetrics);
      }
    }
    
    return result;
  }

  /**
   * 엔드포인트별 통계 계산
   */
  private calculateEndpointStats(
    responseTimeMetrics: PerformanceMetric[],
    throughputMetrics: PerformanceMetric[],
    errorMetrics: PerformanceMetric[]
  ): Array<{
    path: string;
    method: string;
    averageResponseTime: number;
    requestCount: number;
    errorCount: number;
  }> {
    const endpointStats = new Map<string, {
      path: string;
      method: string;
      responseTimes: number[];
      requestCount: number;
      errorCount: number;
    }>();

    // 처리량 데이터 처리
    throughputMetrics.forEach(metric => {
      const key = `${metric.tags.method}:${metric.tags.endpoint}`;
      if (!endpointStats.has(key)) {
        endpointStats.set(key, {
          path: metric.tags.endpoint,
          method: metric.tags.method,
          responseTimes: [],
          requestCount: 0,
          errorCount: 0
        });
      }
      endpointStats.get(key)!.requestCount++;
    });

    // 응답 시간 데이터 처리
    responseTimeMetrics.forEach(metric => {
      const key = `${metric.tags.method}:${metric.tags.endpoint}`;
      const stats = endpointStats.get(key);
      if (stats) {
        stats.responseTimes.push(metric.value);
      }
    });

    // 에러 데이터 처리
    errorMetrics.forEach(metric => {
      const key = `${metric.tags.method}:${metric.tags.endpoint}`;
      const stats = endpointStats.get(key);
      if (stats) {
        stats.errorCount++;
      }
    });

    // 결과 변환
    return Array.from(endpointStats.values()).map(stats => ({
      path: stats.path,
      method: stats.method,
      averageResponseTime: stats.responseTimes.length > 0
        ? stats.responseTimes.reduce((sum, time) => sum + time, 0) / stats.responseTimes.length
        : 0,
      requestCount: stats.requestCount,
      errorCount: stats.errorCount
    }));
  }

  /**
   * 알람 통계 계산
   */
  private calculateAlertStats(startTime: Date, endTime: Date): {
    total: number;
    critical: number;
    resolved: number;
  } {
    const alerts = Array.from(this.activeAlerts.values());
    const periodAlerts = alerts.filter(
      alert => alert.triggeredAt >= startTime && alert.triggeredAt <= endTime
    );

    return {
      total: periodAlerts.length,
      critical: periodAlerts.filter(alert => alert.severity === 'critical').length,
      resolved: periodAlerts.filter(alert => alert.resolved).length
    };
  }

  /**
   * 가동 시간 계산
   */
  private calculateUptime(startTime: Date, endTime: Date): number {
    // 간단한 가동 시간 계산 (실제로는 더 정교한 로직 필요)
    const errorMetrics = this.getMetricsByType(MetricType.ERROR_RATE, startTime, endTime);
    const throughputMetrics = this.getMetricsByType(MetricType.THROUGHPUT, startTime, endTime);
    
    if (throughputMetrics.length === 0) return 100;
    
    const errorRate = (errorMetrics.length / throughputMetrics.length) * 100;
    return Math.max(0, 100 - errorRate);
  }

  /**
   * 차트 데이터 생성 (예시)
   */
  private generateResponseTimeChart(startTime: Date, endTime: Date): any {
    const metrics = this.getMetricsByType(MetricType.RESPONSE_TIME, startTime, endTime);
    
    // 5분 간격으로 데이터 집계
    const intervals = this.groupMetricsByInterval(metrics, 5 * 60 * 1000);
    
    return {
      type: 'line',
      title: 'Response Time',
      data: intervals.map(interval => ({
        timestamp: interval.timestamp,
        value: interval.average
      }))
    };
  }

  private generateThroughputChart(startTime: Date, endTime: Date): any {
    const metrics = this.getMetricsByType(MetricType.THROUGHPUT, startTime, endTime);
    const intervals = this.groupMetricsByInterval(metrics, 5 * 60 * 1000);
    
    return {
      type: 'bar',
      title: 'Throughput (requests/min)',
      data: intervals.map(interval => ({
        timestamp: interval.timestamp,
        value: interval.count / 5 // 5분당 요청을 분당으로 변환
      }))
    };
  }

  private generateErrorRateChart(startTime: Date, endTime: Date): any {
    const errorMetrics = this.getMetricsByType(MetricType.ERROR_RATE, startTime, endTime);
    const throughputMetrics = this.getMetricsByType(MetricType.THROUGHPUT, startTime, endTime);
    
    const intervals = this.groupMetricsByInterval(throughputMetrics, 5 * 60 * 1000);
    const errorIntervals = this.groupMetricsByInterval(errorMetrics, 5 * 60 * 1000);
    
    return {
      type: 'line',
      title: 'Error Rate (%)',
      data: intervals.map(interval => {
        const errorInterval = errorIntervals.find(
          ei => Math.abs(ei.timestamp.getTime() - interval.timestamp.getTime()) < 60000
        );
        const errorRate = interval.count > 0 
          ? ((errorInterval?.count || 0) / interval.count) * 100 
          : 0;
        
        return {
          timestamp: interval.timestamp,
          value: errorRate
        };
      })
    };
  }

  private generateEndpointPerformanceChart(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const responseTimeMetrics = this.getMetricsByType(MetricType.RESPONSE_TIME, oneHourAgo, now);
    const throughputMetrics = this.getMetricsByType(MetricType.THROUGHPUT, oneHourAgo, now);
    
    const endpointStats = this.calculateEndpointStats(responseTimeMetrics, throughputMetrics, []);
    
    return {
      type: 'scatter',
      title: 'Endpoint Performance (Response Time vs Request Count)',
      data: endpointStats.map(endpoint => ({
        label: `${endpoint.method} ${endpoint.path}`,
        x: endpoint.requestCount,
        y: endpoint.averageResponseTime
      }))
    };
  }

  /**
   * 메트릭을 시간 간격별로 그룹화
   */
  private groupMetricsByInterval(
    metrics: PerformanceMetric[],
    intervalMs: number
  ): Array<{ timestamp: Date; count: number; sum: number; average: number }> {
    const groups = new Map<number, PerformanceMetric[]>();
    
    metrics.forEach(metric => {
      const intervalKey = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
      if (!groups.has(intervalKey)) {
        groups.set(intervalKey, []);
      }
      groups.get(intervalKey)!.push(metric);
    });
    
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, intervalMetrics]) => {
        const sum = intervalMetrics.reduce((total, metric) => total + metric.value, 0);
        const count = intervalMetrics.length;
        const average = count > 0 ? sum / count : 0;
        
        return {
          timestamp: new Date(timestamp),
          count,
          sum,
          average
        };
      });
  }

  /**
   * 성능 권장사항 생성
   */
  private generatePerformanceRecommendations(
    stats: PerformanceStats,
    realTime: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (stats.metrics.averageResponseTime > 500) {
      recommendations.push('Average response time is high. Consider implementing caching or optimizing database queries.');
    }
    
    if (stats.metrics.errorRate > 5) {
      recommendations.push('Error rate is elevated. Review recent deployments and check application logs.');
    }
    
    if (realTime.systemHealth === 'warning') {
      recommendations.push('System health is in warning state. Monitor closely and consider scaling resources.');
    }
    
    if (stats.metrics.throughput < 10) {
      recommendations.push('Low throughput detected. Check for bottlenecks in the request pipeline.');
    }
    
    const slowEndpoints = stats.endpoints.filter(ep => ep.averageResponseTime > 1000);
    if (slowEndpoints.length > 0) {
      recommendations.push(`${slowEndpoints.length} endpoints have slow response times. Focus optimization efforts on these endpoints.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performance is healthy. Continue monitoring.');
    }
    
    return recommendations;
  }

  /**
   * 오래된 알람 정리
   */
  private cleanupOldAlerts(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.triggeredAt < cutoff) {
        this.activeAlerts.delete(alertId);
      }
    }
  }
} 