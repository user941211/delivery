import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 환경 변수 검증 및 로드를 위한 유틸리티 클래스
 * 개발, 스테이징, 프로덕션 환경별 설정을 관리합니다.
 */
export class EnvConfigUtil {
  private static readonly logger = new Logger(EnvConfigUtil.name);
  private static instance: EnvConfigUtil;
  private envConfig: Record<string, string> = {};

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): EnvConfigUtil {
    if (!EnvConfigUtil.instance) {
      EnvConfigUtil.instance = new EnvConfigUtil();
    }
    return EnvConfigUtil.instance;
  }

  /**
   * 환경별 설정 파일을 로드합니다.
   * @param environment 환경 (development, staging, production)
   */
  public loadEnvironmentConfig(environment?: string): void {
    const env = environment || process.env.NODE_ENV || 'development';
    
    EnvConfigUtil.logger.log(`환경 설정 로드 시작: ${env}`);

    // 기본 .env 파일 로드
    this.loadEnvFile('.env');
    
    // 환경별 .env 파일 로드 (우선순위 높음)
    this.loadEnvFile(`.env.${env}`);
    
    // 로컬 오버라이드 파일 로드 (최고 우선순위)
    this.loadEnvFile('.env.local');

    // 환경 변수 검증
    this.validateRequiredVariables();

    EnvConfigUtil.logger.log(`환경 설정 로드 완료: ${env}`);
  }

  /**
   * 특정 .env 파일을 로드합니다.
   * @param filename 파일명
   */
  private loadEnvFile(filename: string): void {
    const filePath = path.resolve(process.cwd(), filename);
    
    if (fs.existsSync(filePath)) {
      EnvConfigUtil.logger.debug(`환경 파일 로드: ${filename}`);
      const result = dotenv.config({ path: filePath });
      
      if (result.error) {
        EnvConfigUtil.logger.warn(`환경 파일 로드 실패: ${filename} - ${result.error.message}`);
      } else {
        // 로드된 환경 변수를 내부 설정에 병합
        Object.assign(this.envConfig, result.parsed || {});
      }
    } else {
      EnvConfigUtil.logger.debug(`환경 파일 없음: ${filename}`);
    }
  }

  /**
   * 필수 환경 변수들을 검증합니다.
   */
  private validateRequiredVariables(): void {
    const requiredVars = this.getRequiredVariables();
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName] && !this.envConfig[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `필수 환경 변수가 누락되었습니다: ${missingVars.join(', ')}`;
      EnvConfigUtil.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    EnvConfigUtil.logger.log('모든 필수 환경 변수 검증 완료');
  }

  /**
   * 환경별 필수 환경 변수 목록을 반환합니다.
   */
  private getRequiredVariables(): string[] {
    const env = process.env.NODE_ENV || 'development';
    
    const baseRequired = [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const developmentRequired = [
      ...baseRequired
    ];

    const stagingRequired = [
      ...baseRequired,
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'REDIS_URL'
    ];

    const productionRequired = [
      ...baseRequired,
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL',
      'REDIS_PASSWORD',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
      'SENTRY_DSN'
    ];

    switch (env) {
      case 'production':
        return productionRequired;
      case 'staging':
        return stagingRequired;
      case 'development':
      default:
        return developmentRequired;
    }
  }

  /**
   * 환경 변수 값을 안전하게 가져옵니다.
   * @param key 환경 변수 키
   * @param defaultValue 기본값
   */
  public get(key: string, defaultValue?: string): string {
    return process.env[key] || this.envConfig[key] || defaultValue || '';
  }

  /**
   * 환경 변수 값을 숫자로 가져옵니다.
   * @param key 환경 변수 키
   * @param defaultValue 기본값
   */
  public getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? (defaultValue || 0) : parsed;
  }

  /**
   * 환경 변수 값을 불린으로 가져옵니다.
   * @param key 환경 변수 키
   * @param defaultValue 기본값
   */
  public getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key).toLowerCase();
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return defaultValue || false;
  }

  /**
   * 환경 변수 값을 배열로 가져옵니다.
   * @param key 환경 변수 키
   * @param separator 구분자 (기본값: ',')
   * @param defaultValue 기본값
   */
  public getArray(key: string, separator: string = ',', defaultValue?: string[]): string[] {
    const value = this.get(key);
    if (!value) return defaultValue || [];
    return value.split(separator).map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * 현재 환경이 개발 환경인지 확인합니다.
   */
  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * 현재 환경이 스테이징 환경인지 확인합니다.
   */
  public isStaging(): boolean {
    return this.get('NODE_ENV') === 'staging';
  }

  /**
   * 현재 환경이 프로덕션 환경인지 확인합니다.
   */
  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * 환경 설정 정보를 로깅합니다 (민감한 정보 제외).
   */
  public logEnvironmentInfo(): void {
    const env = this.get('NODE_ENV');
    const port = this.get('API_PORT');
    const dbConnected = !!this.get('DATABASE_URL');
    const redisConnected = !!this.get('REDIS_URL');
    
    EnvConfigUtil.logger.log('=== 환경 설정 정보 ===');
    EnvConfigUtil.logger.log(`환경: ${env}`);
    EnvConfigUtil.logger.log(`포트: ${port}`);
    EnvConfigUtil.logger.log(`데이터베이스 연결: ${dbConnected ? '설정됨' : '미설정'}`);
    EnvConfigUtil.logger.log(`Redis 연결: ${redisConnected ? '설정됨' : '미설정'}`);
    EnvConfigUtil.logger.log(`디버그 모드: ${this.getBoolean('DEBUG')}`);
    EnvConfigUtil.logger.log(`인증 비활성화: ${this.getBoolean('DISABLE_AUTH')}`);
    EnvConfigUtil.logger.log('=====================');
  }

  /**
   * 보안에 민감한 환경 변수들이 기본값으로 설정되어 있는지 검사합니다.
   */
  public validateSecuritySettings(): void {
    if (this.isProduction()) {
      const securityChecks = [
        { key: 'JWT_SECRET', insecureValues: ['dev-jwt-secret-not-for-production', 'your-super-secret-jwt-key-change-this-in-production'] },
        { key: 'JWT_REFRESH_SECRET', insecureValues: ['dev-refresh-secret-not-for-production', 'your-super-secret-refresh-key-change-this-in-production'] },
        { key: 'NEXTAUTH_SECRET', insecureValues: ['dev-nextauth-secret', 'your-nextauth-secret-change-this-in-production'] },
        { key: 'DATABASE_URL', insecureValues: ['postgresql://postgres:devpassword@localhost:5433/delivery_platform_dev'] }
      ];

      const insecureSettings: string[] = [];

      for (const check of securityChecks) {
        const value = this.get(check.key);
        if (check.insecureValues.includes(value)) {
          insecureSettings.push(check.key);
        }
      }

      if (insecureSettings.length > 0) {
        const errorMessage = `프로덕션 환경에서 안전하지 않은 기본값이 감지되었습니다: ${insecureSettings.join(', ')}`;
        EnvConfigUtil.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      EnvConfigUtil.logger.log('보안 설정 검증 완료');
    }
  }

  /**
   * 환경 설정을 JSON 형태로 내보냅니다 (민감한 정보 제외).
   */
  public exportSafeConfig(): Record<string, any> {
    const sensitiveKeys = [
      'JWT_SECRET', 'JWT_REFRESH_SECRET', 'NEXTAUTH_SECRET', 'ENCRYPTION_KEY',
      'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REDIS_PASSWORD',
      'STRIPE_SECRET_KEY', 'TOSS_SECRET_KEY', 'TWILIO_AUTH_TOKEN',
      'SENDGRID_API_KEY', 'AWS_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY',
      'FCM_SERVER_KEY', 'GOOGLE_CLIENT_SECRET', 'KAKAO_CLIENT_SECRET',
      'NAVER_CLIENT_SECRET', 'SENTRY_DSN'
    ];

    const safeConfig: Record<string, any> = {};

    // 모든 환경 변수를 순회하면서 민감하지 않은 것들만 포함
    for (const [key, value] of Object.entries(process.env)) {
      if (!sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey))) {
        safeConfig[key] = value;
      }
    }

    return safeConfig;
  }
} 