/**
 * 사용자 관련 타입 정의
 * 
 * 고객, 음식점 사장, 배달기사, 관리자 등 모든 사용자 타입을 정의합니다.
 */

import { BaseEntity, Address, ContactInfo, Rating } from './base';

/** 사용자 역할 */
export type UserRole = 'customer' | 'restaurant_owner' | 'delivery_driver' | 'admin';

/** 사용자 상태 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

/** 기본 사용자 인터페이스 */
export interface BaseUser extends BaseEntity {
  /** 이메일 (로그인 ID) */
  email: string;
  /** 사용자명 */
  username: string;
  /** 실명 */
  fullName: string;
  /** 전화번호 */
  phone: string;
  /** 사용자 역할 */
  role: UserRole;
  /** 계정 상태 */
  status: UserStatus;
  /** 프로필 이미지 URL */
  profileImageUrl?: string;
  /** 이메일 인증 여부 */
  isEmailVerified: boolean;
  /** 전화번호 인증 여부 */
  isPhoneVerified: boolean;
  /** 마지막 로그인 시간 */
  lastLoginAt?: Date;
}

/** 고객 정보 */
export interface Customer extends BaseUser {
  role: 'customer';
  /** 배달 주소들 */
  addresses: CustomerAddress[];
  /** 기본 배달 주소 ID */
  defaultAddressId?: string;
  /** 즐겨찾는 음식점 ID 목록 */
  favoriteRestaurantIds: string[];
  /** 총 주문 횟수 */
  totalOrders: number;
  /** 총 주문 금액 */
  totalSpent: number;
  /** 멤버십 등급 */
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** 생일 (선택사항) */
  birthDate?: Date;
  /** 마케팅 동의 여부 */
  marketingConsent: boolean;
}

/** 고객 주소 */
export interface CustomerAddress extends Address {
  /** 고유 ID */
  id: string;
  /** 고객 ID */
  customerId: string;
  /** 주소 별칭 (예: 집, 회사) */
  alias: string;
  /** 기본 주소 여부 */
  isDefault: boolean;
  /** 배달 요청사항 */
  deliveryInstructions?: string;
  /** 생성 시간 */
  createdAt: Date;
  /** 수정 시간 */
  updatedAt: Date;
}

/** 음식점 사장 정보 */
export interface RestaurantOwner extends BaseUser {
  role: 'restaurant_owner';
  /** 사업자 등록번호 */
  businessRegistrationNumber: string;
  /** 사업자 등록증 파일 URL */
  businessLicenseUrl: string;
  /** 신분증 파일 URL */
  identificationUrl: string;
  /** 계좌 정보 */
  bankAccount: BankAccount;
  /** 관리하는 음식점 ID 목록 */
  restaurantIds: string[];
  /** 인증 상태 */
  verificationStatus: 'pending' | 'verified' | 'rejected';
  /** 인증 거부 사유 */
  rejectionReason?: string;
}

/** 배달기사 정보 */
export interface DeliveryDriver extends BaseUser {
  role: 'delivery_driver';
  /** 운전면허증 번호 */
  licenseNumber: string;
  /** 운전면허증 파일 URL */
  licenseUrl: string;
  /** 차량 정보 */
  vehicle: VehicleInfo;
  /** 현재 위치 */
  currentLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
  /** 배달 가능 상태 */
  isOnline: boolean;
  /** 현재 배달 중인 주문 ID */
  currentDeliveryId?: string;
  /** 평점 정보 */
  rating: Rating;
  /** 총 배달 완료 수 */
  totalDeliveries: number;
  /** 이번 달 수익 */
  monthlyEarnings: number;
  /** 계좌 정보 */
  bankAccount: BankAccount;
  /** 인증 상태 */
  verificationStatus: 'pending' | 'verified' | 'rejected';
  /** 배달 가능 지역 */
  serviceAreas: string[];
}

/** 차량 정보 */
export interface VehicleInfo {
  /** 차량 종류 */
  type: 'motorcycle' | 'bicycle' | 'car' | 'scooter';
  /** 차량 번호 */
  plateNumber?: string;
  /** 차량 모델명 */
  model?: string;
  /** 차량 색상 */
  color?: string;
  /** 차량 등록증 URL */
  registrationUrl?: string;
}

/** 배달기사 신청 관련 타입 */

/** 배달기사 신청 상태 */
export type DriverApplicationStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'additional_info_required';

/** 배달기사 신청서 차량 정보 */
export interface DriverApplicationVehicleInfo {
  /** 차량 유형 */
  type: 'motorcycle' | 'bicycle' | 'car' | 'electric_scooter';
  /** 차량 번호 (오토바이/자동차의 경우) */
  plateNumber?: string;
  /** 차량 모델명 */
  model: string;
  /** 제조년도 */
  year: string;
  /** 차량 색상 */
  color: string;
}

/** 배달기사 신청서 서류 정보 */
export interface DriverApplicationDocuments {
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

/** 배달기사 신청서 배달 구역 */
export interface DriverApplicationDeliveryArea {
  /** 구역 이름 */
  name: string;
  /** 위도 */
  latitude: string;
  /** 경도 */
  longitude: string;
  /** 반경 (미터) */
  radius: string;
}

/** 배달기사 신청서 */
export interface DriverApplication extends BaseEntity {
  /** 신청자 사용자 ID */
  userId: string;
  /** 신청자 정보 (조인된 데이터) */
  applicant?: BaseUser;
  /** 차량 정보 */
  vehicleInfo: DriverApplicationVehicleInfo;
  /** 서류 정보 */
  documents: DriverApplicationDocuments;
  /** 희망 배달 구역 목록 */
  deliveryAreas: DriverApplicationDeliveryArea[];
  /** 자기소개 및 지원 동기 */
  introduction?: string;
  /** 신청 상태 */
  status: DriverApplicationStatus;
  /** 검토 의견 */
  reviewComment?: string;
  /** 검토자 ID (관리자 사용자 ID) */
  reviewedBy?: string;
  /** 검토 일시 */
  reviewedAt?: Date;
  /** 개인정보 처리 동의 */
  privacyConsent: boolean;
  /** 서비스 이용약관 동의 */
  termsConsent: boolean;
}

/** 배달기사 신청서 생성 요청 */
export interface CreateDriverApplicationRequest {
  /** 차량 정보 */
  vehicleInfo: DriverApplicationVehicleInfo;
  /** 서류 정보 */
  documents: DriverApplicationDocuments;
  /** 희망 배달 구역 목록 */
  deliveryAreas: DriverApplicationDeliveryArea[];
  /** 자기소개 및 지원 동기 */
  introduction?: string;
  /** 개인정보 처리 동의 */
  privacyConsent: boolean;
  /** 서비스 이용약관 동의 */
  termsConsent: boolean;
}

/** 배달기사 신청서 업데이트 요청 */
export interface UpdateDriverApplicationRequest {
  /** 차량 정보 */
  vehicleInfo?: DriverApplicationVehicleInfo;
  /** 서류 정보 */
  documents?: DriverApplicationDocuments;
  /** 희망 배달 구역 목록 */
  deliveryAreas?: DriverApplicationDeliveryArea[];
  /** 자기소개 및 지원 동기 */
  introduction?: string;
}

/** 배달기사 신청서 검토 요청 */
export interface ReviewDriverApplicationRequest {
  /** 승인 여부 */
  approved: boolean;
  /** 검토 의견 */
  reviewComment?: string;
  /** 추가 정보 요청 여부 */
  requiresAdditionalInfo?: boolean;
}

/** 배달기사 신청서 목록 조회 쿼리 */
export interface GetDriverApplicationsQuery {
  /** 신청 상태 필터 */
  status?: DriverApplicationStatus;
  /** 페이지 번호 */
  page?: number;
  /** 페이지당 항목 수 */
  limit?: number;
  /** 검색 키워드 */
  search?: string;
}

/** 배달기사 신청서 목록 응답 */
export interface DriverApplicationListResponse {
  /** 신청서 목록 */
  applications: DriverApplication[];
  /** 전체 항목 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지당 항목 수 */
  limit: number;
  /** 전체 페이지 수 */
  totalPages: number;
}

/** 관리자 정보 */
export interface Admin extends BaseUser {
  role: 'admin';
  /** 관리자 권한 */
  permissions: AdminPermission[];
  /** 부서 */
  department: string;
  /** 직책 */
  position: string;
}

/** 관리자 권한 */
export type AdminPermission = 
  | 'user_management'
  | 'restaurant_management'
  | 'order_management'
  | 'payment_management'
  | 'analytics'
  | 'system_settings'
  | 'content_management';

/** 계좌 정보 */
export interface BankAccount {
  /** 은행명 */
  bankName: string;
  /** 계좌번호 */
  accountNumber: string;
  /** 예금주명 */
  accountHolderName: string;
  /** 계좌 인증 여부 */
  isVerified: boolean;
}

/** 사용자 생성 요청 */
export interface CreateUserRequest {
  /** 이메일 */
  email: string;
  /** 비밀번호 */
  password: string;
  /** 사용자명 */
  username: string;
  /** 실명 */
  fullName: string;
  /** 전화번호 */
  phone: string;
  /** 사용자 역할 */
  role: UserRole;
  /** 추가 정보 (역할별 상이) */
  additionalInfo?: Record<string, any>;
}

/** 사용자 업데이트 요청 */
export interface UpdateUserRequest {
  /** 사용자명 */
  username?: string;
  /** 실명 */
  fullName?: string;
  /** 전화번호 */
  phone?: string;
  /** 프로필 이미지 URL */
  profileImageUrl?: string;
  /** 추가 정보 */
  additionalInfo?: Record<string, any>;
}

/** 사용자 로그인 요청 */
export interface LoginRequest {
  /** 이메일 */
  email: string;
  /** 비밀번호 */
  password: string;
}

/** 사용자 로그인 응답 */
export interface LoginResponse {
  /** 사용자 정보 */
  user: BaseUser;
  /** 액세스 토큰 */
  accessToken: string;
  /** 리프레시 토큰 */
  refreshToken: string;
  /** 토큰 만료 시간 */
  expiresAt: Date;
} 