import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 로깅 레벨 타입
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * 로그 엔트리 인터페이스
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  meta?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 로깅 서비스
 * 구조화된 로깅과 로그 관리를 담당
 */
@Injectable()
export class LoggingService implements LoggerService {
  private readonly logDir: string;
  private readonly isDevelopment: boolean;
  private readonly maxLogFiles: number = 10;
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  /**
   * 로그 디렉토리 확인 및 생성
   */
  private ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * 메인 로깅 메서드
   */
  private writeLog(entry: LogEntry) {
    // 콘솔 출력 (개발 환경)
    if (this.isDevelopment) {
      this.logToConsole(entry);
    }

    // 파일 출력 (모든 환경)
    this.logToFile(entry);
  }

  /**
   * 콘솔 로그 출력 (개발 환경용)
   */
  private logToConsole(entry: LogEntry) {
    const { timestamp, level, message, context, meta } = entry;
    const contextStr = context ? `[${context}]` : '';
    const metaStr = meta ? JSON.stringify(meta) : '';
    
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${contextStr} ${message} ${metaStr}`.trim();

    switch (level) {
      case 'error':
        console.error('\x1b[31m%s\x1b[0m', logMessage); // 빨간색
        if (entry.error?.stack) {
          console.error('\x1b[31m%s\x1b[0m', entry.error.stack);
        }
        break;
      case 'warn':
        console.warn('\x1b[33m%s\x1b[0m', logMessage); // 노란색
        break;
      case 'info':
        console.info('\x1b[36m%s\x1b[0m', logMessage); // 청록색
        break;
      case 'debug':
        console.debug('\x1b[37m%s\x1b[0m', logMessage); // 흰색
        break;
    }
  }

  /**
   * 파일 로그 출력
   */
  private logToFile(entry: LogEntry) {
    try {
      const logFile = this.getLogFilePath(entry.level);
      const logLine = JSON.stringify(entry) + '\n';

      // 파일 크기 체크 및 로테이션
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(logFile);
        }
      }

      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * 로그 파일 경로 생성
   */
  private getLogFilePath(level: LogLevel): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${level}-${today}.log`);
  }

  /**
   * 로그 파일 로테이션
   */
  private rotateLogFile(filePath: string) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
      
      fs.renameSync(filePath, rotatedPath);
      
      // 오래된 로그 파일 정리
      this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * 오래된 로그 파일 정리
   */
  private cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stats: fs.statSync(path.join(this.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // 최대 개수를 초과하는 파일 삭제
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * 로그 엔트리 생성
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      meta,
      requestId: this.getCurrentRequestId(),
      userId: this.getCurrentUserId()
    };
  }

  /**
   * 현재 요청 ID 가져오기 (실제로는 AsyncLocalStorage 등 사용)
   */
  private getCurrentRequestId(): string | undefined {
    // 실제 구현에서는 AsyncLocalStorage나 cls-hooked 등을 사용하여
    // 현재 HTTP 요청의 ID를 추적
    return undefined;
  }

  /**
   * 현재 사용자 ID 가져오기
   */
  private getCurrentUserId(): string | undefined {
    // 실제 구현에서는 현재 인증된 사용자의 ID를 가져옴
    return undefined;
  }

  // NestJS LoggerService 인터페이스 구현

  /**
   * 에러 로그
   */
  error(message: any, trace?: string, context?: string) {
    const entry = this.createLogEntry('error', message, context);
    
    if (trace) {
      entry.error = {
        name: 'Error',
        message: message,
        stack: trace
      };
    }

    this.writeLog(entry);
  }

  /**
   * 경고 로그
   */
  warn(message: any, context?: string) {
    const entry = this.createLogEntry('warn', message, context);
    this.writeLog(entry);
  }

  /**
   * 정보 로그
   */
  log(message: any, context?: string) {
    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry);
  }

  /**
   * 디버그 로그
   */
  debug(message: any, context?: string) {
    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry);
  }

  /**
   * Verbose 로그 (debug와 동일하게 처리)
   */
  verbose(message: any, context?: string) {
    this.debug(message, context);
  }

  // 추가 유틸리티 메서드들

  /**
   * 구조화된 로그 (메타데이터 포함)
   */
  logWithMeta(
    level: LogLevel,
    message: string,
    meta: Record<string, any>,
    context?: string
  ) {
    const entry = this.createLogEntry(level, message, context, meta);
    this.writeLog(entry);
  }

  /**
   * HTTP 요청 로그
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ) {
    this.logWithMeta('info', `HTTP ${method} ${url}`, {
      method,
      url,
      statusCode,
      responseTime,
      userId
    }, 'HTTP');
  }

  /**
   * 데이터베이스 쿼리 로그
   */
  logDatabaseQuery(
    query: string,
    executionTime: number,
    error?: Error
  ) {
    const level = error ? 'error' : 'debug';
    const message = error ? `Database query failed: ${error.message}` : 'Database query executed';
    
    const meta: Record<string, any> = {
      query,
      executionTime
    };

    if (error) {
      meta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.logWithMeta(level, message, meta, 'Database');
  }

  /**
   * 사용자 액션 로그
   */
  logUserAction(
    userId: string,
    action: string,
    resource: string,
    meta?: Record<string, any>
  ) {
    this.logWithMeta('info', `User action: ${action}`, {
      userId,
      action,
      resource,
      ...meta
    }, 'UserAction');
  }

  /**
   * 비즈니스 이벤트 로그
   */
  logBusinessEvent(
    event: string,
    data: Record<string, any>,
    context?: string
  ) {
    this.logWithMeta('info', `Business event: ${event}`, data, context || 'BusinessEvent');
  }

  /**
   * 로그 파일 목록 조회
   */
  getLogFiles(): Array<{ name: string; size: number; created: Date; modified: Date }> {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      return files;
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * 로그 파일 내용 읽기
   */
  readLogFile(fileName: string, lines: number = 100): string[] {
    try {
      const filePath = path.join(this.logDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Log file ${fileName} not found`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      // 최근 N개 라인 반환
      return allLines.slice(-lines);
    } catch (error) {
      throw new Error(`Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 