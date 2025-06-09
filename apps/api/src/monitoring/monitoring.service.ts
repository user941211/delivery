import { Injectable } from '@nestjs/common';
import { createSupabaseServerClient } from '../../../../packages/database/src/supabase';
import * as os from 'os';
import * as process from 'process';

/**
 * 모니터링 서비스
 * 시스템 상태, 성능, 데이터베이스 연결 등을 모니터링
 */
@Injectable()
export class MonitoringService {
  private readonly supabase = createSupabaseServerClient();
  private readonly startTime = Date.now();

  /**
   * 전체 시스템 헬스 체크
   */
  async getHealthCheck() {
    const timestamp = new Date().toISOString();
    
    try {
      const [
        databaseHealth,
        systemHealth,
        apiHealth
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.getSystemHealth(),
        this.getApiHealth()
      ]);

      const isHealthy = databaseHealth.status === 'healthy' && 
                       systemHealth.status === 'healthy' &&
                       apiHealth.status === 'healthy';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp,
        checks: {
          database: databaseHealth,
          system: systemHealth,
          api: apiHealth
        },
        uptime: this.getUptime(),
        version: process.env.npm_package_version || '1.0.0'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: this.getUptime()
      };
    }
  }

  /**
   * 데이터베이스 연결 상태 체크
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // 간단한 쿼리로 데이터베이스 연결 테스트
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          message: error.message,
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime,
        details: {
          provider: 'Supabase PostgreSQL',
          query: 'SELECT count from users LIMIT 1'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: 0
      };
    }
  }

  /**
   * 시스템 리소스 상태 체크
   */
  getSystemHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // 임계치 설정
      const MEMORY_THRESHOLD = 80; // 80%
      const HEAP_THRESHOLD = 1024 * 1024 * 1024; // 1GB

      const isMemoryHealthy = memoryUsagePercent < MEMORY_THRESHOLD;
      const isHeapHealthy = memoryUsage.heapUsed < HEAP_THRESHOLD;

      return {
        status: isMemoryHealthy && isHeapHealthy ? 'healthy' : 'warning',
        message: isMemoryHealthy && isHeapHealthy ? 'System resources normal' : 'High resource usage detected',
        details: {
          memory: {
            used: Math.round(usedMemory / 1024 / 1024), // MB
            total: Math.round(totalMemory / 1024 / 1024), // MB
            percentage: Math.round(memoryUsagePercent * 100) / 100,
            threshold: MEMORY_THRESHOLD
          },
          heap: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
            threshold: Math.round(HEAP_THRESHOLD / 1024 / 1024) // MB
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          platform: os.platform(),
          architecture: os.arch(),
          nodeVersion: process.version,
          loadAverage: os.loadavg()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'System health check failed'
      };
    }
  }

  /**
   * API 서버 상태 체크
   */
  getApiHealth() {
    try {
      const uptime = this.getUptime();
      const pid = process.pid;
      const env = process.env.NODE_ENV || 'development';

      return {
        status: 'healthy',
        message: 'API server running normally',
        details: {
          pid,
          environment: env,
          uptime,
          startTime: new Date(this.startTime).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'API health check failed'
      };
    }
  }

  /**
   * 상세 시스템 메트릭 조회
   */
  async getDetailedMetrics() {
    try {
      const [
        systemMetrics,
        databaseMetrics,
        applicationMetrics
      ] = await Promise.all([
        this.getSystemMetrics(),
        this.getDatabaseMetrics(),
        this.getApplicationMetrics()
      ]);

      return {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: databaseMetrics,
        application: applicationMetrics
      };
    } catch (error) {
      throw new Error(`Failed to collect metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  private getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      os: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        versions: process.versions
      }
    };
  }

  /**
   * 데이터베이스 메트릭 수집
   */
  private async getDatabaseMetrics() {
    try {
      // 각 테이블의 레코드 수 조회
      const tables = ['users', 'restaurants', 'orders', 'reviews'] as const;
      const metrics: Record<string, any> = {};

      for (const table of tables) {
        try {
          const { count, error } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (!error) {
            metrics[`${table}_count`] = count || 0;
          }
        } catch (tableError) {
          metrics[`${table}_count`] = 'error';
        }
      }

      // 최근 활동 통계
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const { count: recentOrders } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo.toISOString());

      const { count: recentUsers } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo.toISOString());

      return {
        tables: metrics,
        activity: {
          recent_orders_1h: recentOrders || 0,
          recent_users_1h: recentUsers || 0
        },
        connection: 'active'
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Database metrics collection failed',
        connection: 'error'
      };
    }
  }

  /**
   * 애플리케이션 메트릭 수집
   */
  private getApplicationMetrics() {
    return {
      uptime: this.getUptime(),
      startTime: this.startTime,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      features: {
        clustering: !!process.env.CLUSTER_MODE,
        ssl: !!process.env.HTTPS_ENABLED,
        monitoring: true,
        websockets: true
      }
    };
  }

  /**
   * 업타임 계산 (초 단위)
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Prometheus 형식 메트릭 생성
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      const metrics = await this.getDetailedMetrics();
      const lines: string[] = [];

      // 헬프 메시지 추가
      lines.push('# HELP delivery_platform_uptime_seconds Total uptime of the application');
      lines.push('# TYPE delivery_platform_uptime_seconds counter');
      lines.push(`delivery_platform_uptime_seconds ${metrics.application.uptime}`);

      lines.push('# HELP delivery_platform_memory_usage_bytes Memory usage in bytes');
      lines.push('# TYPE delivery_platform_memory_usage_bytes gauge');
      lines.push(`delivery_platform_memory_usage_bytes{type="rss"} ${metrics.system.memory.rss}`);
      lines.push(`delivery_platform_memory_usage_bytes{type="heap_total"} ${metrics.system.memory.heapTotal}`);
      lines.push(`delivery_platform_memory_usage_bytes{type="heap_used"} ${metrics.system.memory.heapUsed}`);

      lines.push('# HELP delivery_platform_cpu_usage_microseconds CPU usage in microseconds');
      lines.push('# TYPE delivery_platform_cpu_usage_microseconds counter');
      lines.push(`delivery_platform_cpu_usage_microseconds{type="user"} ${metrics.system.cpu.user}`);
      lines.push(`delivery_platform_cpu_usage_microseconds{type="system"} ${metrics.system.cpu.system}`);

      // 데이터베이스 메트릭
      if (metrics.database.tables) {
        lines.push('# HELP delivery_platform_database_records Total records in database tables');
        lines.push('# TYPE delivery_platform_database_records gauge');
        
        Object.entries(metrics.database.tables).forEach(([key, value]) => {
          if (typeof value === 'number') {
            lines.push(`delivery_platform_database_records{table="${key.replace('_count', '')}"} ${value}`);
          }
        });
      }

      return lines.join('\n') + '\n';
    } catch (error) {
      throw new Error(`Failed to generate Prometheus metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 로그 레벨별 통계 조회 (향후 구현)
   */
  async getLogStatistics(hours: number = 24) {
    // 실제 구현에서는 로그 수집 시스템과 연동
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return {
      period: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        hours
      },
      counts: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0
      },
      // 실제로는 로그 저장소에서 조회
      note: 'Log statistics feature pending log aggregation implementation'
    };
  }
} 