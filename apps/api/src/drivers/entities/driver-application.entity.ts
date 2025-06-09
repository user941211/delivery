/**
 * 배달기사 신청 관련 엔티티
 * 
 * Supabase 데이터베이스의 배달기사 신청 테이블 구조를 정의합니다.
 */

import { VehicleType, ApplicationStatus, DriverApplicationResponseDto } from '../dto/driver-application.dto';

/** 차량 정보 엔티티 */
export interface VehicleInfo {
  /** 차량 유형 */
  type: VehicleType;
  /** 차량 번호 (오토바이/자동차의 경우) */
  plateNumber?: string;
  /** 차량 모델명 */
  model: string;
  /** 제조년도 */
  year: string;
  /** 차량 색상 */
  color: string;
}

/** 서류 정보 엔티티 */
export interface DocumentInfo {
  /** 신분증 사진 URL */
  identificationUrl: string;
  /** 운전면허증 사진 URL (오토바이/자동차의 경우) */
  drivingLicenseUrl?: string;
  /** 차량등록증 사진 URL (오토바이/자동차의 경우) */
  vehicleRegistrationUrl?: string;
  /** 보험증서 사진 URL */
  insuranceUrl: string;
  /** 통장 사본 URL (급여 지급용) */
  bankAccountUrl: string;
}

/** 배달 구역 엔티티 */
export interface DeliveryArea {
  /** 구역 이름 */
  name: string;
  /** 위도 */
  latitude: string;
  /** 경도 */
  longitude: string;
  /** 반경 (미터) */
  radius: string;
}

/** 배달기사 신청서 엔티티 (Supabase 테이블 구조) */
export interface DriverApplicationEntity {
  /** 신청서 고유 ID */
  id: string;
  /** 신청자 사용자 ID (users 테이블 참조) */
  user_id: string;
  /** 차량 정보 (JSON) */
  vehicle_info: VehicleInfo;
  /** 서류 정보 (JSON) */
  documents: DocumentInfo;
  /** 희망 배달 구역 목록 (JSON) */
  delivery_areas: DeliveryArea[];
  /** 자기소개 및 지원 동기 */
  introduction?: string;
  /** 신청 상태 */
  status: ApplicationStatus;
  /** 검토 의견 */
  review_comment?: string;
  /** 검토자 ID (관리자 사용자 ID) */
  reviewed_by?: string;
  /** 검토 일시 */
  reviewed_at?: string;
  /** 개인정보 처리 동의 */
  privacy_consent: boolean;
  /** 서비스 이용약관 동의 */
  terms_consent: boolean;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 사용자 정보 조인을 위한 확장 엔티티 */
export interface DriverApplicationWithUserEntity extends DriverApplicationEntity {
  /** 신청자 정보 */
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    phone: string;
    role: string;
    status: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    profile_image_url?: string;
    created_at: string;
    updated_at: string;
  };
}

/** 배달기사 신청서 생성을 위한 데이터 */
export interface CreateDriverApplicationData {
  user_id: string;
  vehicle_info: VehicleInfo;
  documents: DocumentInfo;
  delivery_areas: DeliveryArea[];
  introduction?: string;
  privacy_consent: boolean;
  terms_consent: boolean;
  status: ApplicationStatus;
}

/** 배달기사 신청서 업데이트를 위한 데이터 */
export interface UpdateDriverApplicationData {
  vehicle_info?: VehicleInfo;
  documents?: DocumentInfo;
  delivery_areas?: DeliveryArea[];
  introduction?: string;
  status?: ApplicationStatus;
  review_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  updated_at: string;
}

/** 배달기사 신청서 목록 조회 필터 */
export interface DriverApplicationFilter {
  /** 신청 상태 */
  status?: ApplicationStatus;
  /** 검색 키워드 */
  search?: string;
  /** 페이지 번호 */
  page: number;
  /** 페이지당 항목 수 */
  limit: number;
}

/** 배달기사 신청서 목록 조회 결과 */
export interface DriverApplicationListResult {
  /** 신청서 목록 */
  applications: DriverApplicationResponseDto[];
  /** 전체 항목 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지당 항목 수 */
  limit: number;
  /** 전체 페이지 수 */
  totalPages: number;
}

/** 배달기사 신청 통계 */
export interface DriverApplicationStats {
  /** 전체 신청 수 */
  total: number;
  /** 대기 중인 신청 수 */
  pending: number;
  /** 검토 중인 신청 수 */
  underReview: number;
  /** 승인된 신청 수 */
  approved: number;
  /** 거부된 신청 수 */
  rejected: number;
  /** 추가 정보 요청 중인 신청 수 */
  additionalInfoRequired: number;
} 