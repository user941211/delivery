/**
 * 채팅 시스템 공통 인터페이스
 * 
 * 여러 서비스에서 공통으로 사용하는 인터페이스들을 정의합니다.
 */

/**
 * 페이지네이션 결과 인터페이스
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 