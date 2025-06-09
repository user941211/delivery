/**
 * 시스템 관련 상수 정의
 */

/** API 버전 */
export const API_VERSION = 'v1';

/** 기본 페이지 크기 */
export const DEFAULT_PAGE_SIZE = 20;

/** 최대 페이지 크기 */
export const MAX_PAGE_SIZE = 100;

/** 요청 타임아웃 (밀리초) */
export const REQUEST_TIMEOUT = 30000;

/** 재시도 횟수 */
export const MAX_RETRY_ATTEMPTS = 3;

/** 파일 업로드 최대 크기 (바이트) - 10MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 허용되는 이미지 확장자 */
export const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'
] as const;

/** 허용되는 문서 확장자 */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'
] as const;

/** 로그 레벨 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
} as const;

/** 캐시 TTL (초) */
export const CACHE_TTL = {
  short: 300,      // 5분
  medium: 1800,    // 30분
  long: 3600,      // 1시간
  daily: 86400     // 24시간
} as const;

/** Rate Limiting */
export const RATE_LIMITS = {
  login: { max: 5, window: 900 },        // 15분에 5번
  api: { max: 1000, window: 3600 },      // 1시간에 1000번
  upload: { max: 10, window: 600 },      // 10분에 10번
  search: { max: 100, window: 300 }      // 5분에 100번
} as const;

/** 세션 만료 시간 (초) */
export const SESSION_TIMEOUT = 7200; // 2시간

/** JWT 토큰 만료 시간 */
export const JWT_EXPIRY = {
  access: '15m',      // 15분
  refresh: '7d',      // 7일
  reset: '1h'         // 1시간 (비밀번호 재설정)
} as const;

/** 데이터베이스 커넥션 풀 설정 */
export const DB_POOL_CONFIG = {
  min: 2,
  max: 10,
  idle: 10000,
  acquire: 60000,
  evict: 1000
} as const;

/** 헬스체크 간격 (초) */
export const HEALTH_CHECK_INTERVAL = 30;

/** 백업 보관 기간 (일) */
export const BACKUP_RETENTION_DAYS = 30;

/** 로그 보관 기간 (일) */
export const LOG_RETENTION_DAYS = 90;

/** 웹소켓 연결 타임아웃 (밀리초) */
export const WEBSOCKET_TIMEOUT = 60000;

/** 웹소켓 핑 간격 (밀리초) */
export const WEBSOCKET_PING_INTERVAL = 25000; 