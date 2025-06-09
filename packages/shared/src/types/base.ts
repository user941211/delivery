/**
 * 기본 타입 정의
 * 
 * 플랫폼 전반에서 사용되는 기본적인 타입들을 정의합니다.
 */

/** 기본 엔티티 인터페이스 */
export interface BaseEntity {
  /** 고유 식별자 */
  id: string;
  /** 생성 시간 */
  createdAt: Date;
  /** 최종 수정 시간 */
  updatedAt: Date;
}

/** 소프트 삭제가 가능한 엔티티 */
export interface SoftDeletableEntity extends BaseEntity {
  /** 삭제 시간 (null이면 삭제되지 않음) */
  deletedAt: Date | null;
}

/** 페이지네이션 메타데이터 */
export interface PaginationMeta {
  /** 현재 페이지 번호 */
  page: number;
  /** 페이지당 아이템 수 */
  limit: number;
  /** 전체 아이템 수 */
  total: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 이전 페이지 존재 여부 */
  hasPrevious: boolean;
  /** 다음 페이지 존재 여부 */
  hasNext: boolean;
}

/** 페이지네이션된 응답 */
export interface PaginatedResponse<T> {
  /** 데이터 배열 */
  data: T[];
  /** 페이지네이션 메타정보 */
  meta: PaginationMeta;
}

/** 검색 필터 기본 인터페이스 */
export interface BaseSearchFilter {
  /** 검색 키워드 */
  search?: string;
  /** 페이지 번호 */
  page?: number;
  /** 페이지당 아이템 수 */
  limit?: number;
  /** 정렬 필드 */
  sortBy?: string;
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
}

/** 시간 범위 필터 */
export interface TimeRangeFilter {
  /** 시작 시간 */
  startDate?: Date;
  /** 종료 시간 */
  endDate?: Date;
}

/** 가격 범위 필터 */
export interface PriceRangeFilter {
  /** 최소 가격 */
  minPrice?: number;
  /** 최대 가격 */
  maxPrice?: number;
}

/** 파일 정보 */
export interface FileInfo {
  /** 파일명 */
  filename: string;
  /** 원본 파일명 */
  originalName: string;
  /** MIME 타입 */
  mimeType: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** 파일 URL */
  url: string;
  /** 업로드 시간 */
  uploadedAt: Date;
}

/** 주소 정보 */
export interface Address {
  /** 우편번호 */
  zipCode: string;
  /** 도/시 */
  province: string;
  /** 시/구 */
  city: string;
  /** 구/동 */
  district: string;
  /** 상세 주소 */
  detail: string;
  /** 전체 주소 (합성) */
  fullAddress: string;
}

/** 연락처 정보 */
export interface ContactInfo {
  /** 전화번호 */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 추가 연락처 */
  alternativePhone?: string;
}

/** 영업 시간 */
export interface BusinessHours {
  /** 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일) */
  dayOfWeek: number;
  /** 오픈 시간 (HH:mm 형식) */
  openTime: string;
  /** 클로즈 시간 (HH:mm 형식) */
  closeTime: string;
  /** 휴무일 여부 */
  isClosed: boolean;
}

/** 평점 정보 */
export interface Rating {
  /** 평균 평점 */
  average: number;
  /** 총 평가 수 */
  count: number;
  /** 별점별 개수 */
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
} 