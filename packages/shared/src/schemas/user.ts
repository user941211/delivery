/**
 * 사용자 관련 Zod 스키마 정의
 */

import { z } from 'zod';
import { baseEntitySchema, addressSchema } from './base';

/**
 * 사용자 역할 스키마
 */
export const userRoleSchema = z.enum(['customer', 'restaurant_owner', 'delivery_driver', 'admin']);

/**
 * 사용자 상태 스키마
 */
export const userStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending_verification']);

/**
 * 기본 사용자 스키마
 */
export const baseUserSchema = baseEntitySchema.extend({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  username: z.string().min(2, '사용자명은 최소 2자 이상이어야 합니다'),
  fullName: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().regex(/^01[016789]\d{7,8}$/, '올바른 휴대폰 번호를 입력해주세요'),
  role: userRoleSchema,
  status: userStatusSchema,
  profileImageUrl: z.string().url().optional(),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
  lastLoginAt: z.date().optional()
});

/**
 * 로그인 요청 스키마
 */
export const loginRequestSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다')
});

/**
 * 사용자 생성 요청 스키마
 */
export const createUserRequestSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  username: z.string().min(2, '사용자명은 최소 2자 이상이어야 합니다'),
  fullName: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().regex(/^01[016789]\d{7,8}$/, '올바른 휴대폰 번호를 입력해주세요'),
  role: userRoleSchema,
  additionalInfo: z.record(z.any()).optional()
});

/**
 * 배달기사 신청 관련 스키마
 */

/**
 * 배달기사 신청 상태 스키마
 */
export const driverApplicationStatusSchema = z.enum([
  'pending',
  'under_review',
  'approved',
  'rejected',
  'additional_info_required'
]);

/**
 * 차량 유형 스키마
 */
export const vehicleTypeSchema = z.enum([
  'motorcycle',
  'bicycle',
  'car',
  'electric_scooter'
]);

/**
 * 배달기사 신청서 차량 정보 스키마
 */
export const driverApplicationVehicleInfoSchema = z.object({
  type: vehicleTypeSchema,
  plateNumber: z.string().regex(/^[0-9]{2,3}[가-힣][0-9]{4}$/, '올바른 차량 번호 형식이 아닙니다.').optional(),
  model: z.string().min(1, '차량 모델명을 입력해주세요').max(100, '차량 모델명은 최대 100자까지 가능합니다'),
  year: z.string().regex(/^(19|20)\d{2}$/, '올바른 제조년도를 입력해주세요'),
  color: z.string().min(1, '차량 색상을 입력해주세요').max(50, '차량 색상은 최대 50자까지 가능합니다')
});

/**
 * 배달기사 신청서 서류 정보 스키마
 */
export const driverApplicationDocumentsSchema = z.object({
  identificationUrl: z.string().url('올바른 URL 형식이 아닙니다'),
  drivingLicenseUrl: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  vehicleRegistrationUrl: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  insuranceUrl: z.string().url('올바른 URL 형식이 아닙니다'),
  bankAccountUrl: z.string().url('올바른 URL 형식이 아닙니다')
});

/**
 * 배달기사 신청서 배달 구역 스키마
 */
export const driverApplicationDeliveryAreaSchema = z.object({
  name: z.string().min(1, '구역 이름을 입력해주세요').max(100, '구역 이름은 최대 100자까지 가능합니다'),
  latitude: z.string().regex(/^-?([1-8]?[0-9]\.{1}\d{1,6}$|90\.{1}0{1,6}$)/, '올바른 위도 형식이 아닙니다'),
  longitude: z.string().regex(/^-?([1]?[0-7][0-9]\.{1}\d{1,6}$|180\.{1}0{1,6}$|[1-9]?[0-9]\.{1}\d{1,6}$)/, '올바른 경도 형식이 아닙니다'),
  radius: z.string().regex(/^[1-9]\d{2,4}$/, '반경은 100미터 이상 99999미터 이하여야 합니다')
});

/**
 * 배달기사 신청서 스키마
 */
export const driverApplicationSchema = baseEntitySchema.extend({
  userId: z.string().uuid('올바른 사용자 ID 형식이 아닙니다'),
  vehicleInfo: driverApplicationVehicleInfoSchema,
  documents: driverApplicationDocumentsSchema,
  deliveryAreas: z.array(driverApplicationDeliveryAreaSchema).min(1, '최소 하나의 배달 구역을 선택해주세요'),
  introduction: z.string().max(1000, '자기소개는 최대 1000자까지 가능합니다').optional(),
  status: driverApplicationStatusSchema,
  reviewComment: z.string().max(500, '검토 의견은 최대 500자까지 가능합니다').optional(),
  reviewedBy: z.string().uuid('올바른 검토자 ID 형식이 아닙니다').optional(),
  reviewedAt: z.date().optional(),
  privacyConsent: z.boolean(),
  termsConsent: z.boolean()
});

/**
 * 배달기사 신청서 생성 요청 스키마
 */
export const createDriverApplicationRequestSchema = z.object({
  vehicleInfo: driverApplicationVehicleInfoSchema,
  documents: driverApplicationDocumentsSchema,
  deliveryAreas: z.array(driverApplicationDeliveryAreaSchema).min(1, '최소 하나의 배달 구역을 선택해주세요'),
  introduction: z.string().max(1000, '자기소개는 최대 1000자까지 가능합니다').optional(),
  privacyConsent: z.boolean().refine(val => val === true, '개인정보 처리 동의가 필요합니다'),
  termsConsent: z.boolean().refine(val => val === true, '서비스 이용약관 동의가 필요합니다')
});

/**
 * 배달기사 신청서 업데이트 요청 스키마
 */
export const updateDriverApplicationRequestSchema = z.object({
  vehicleInfo: driverApplicationVehicleInfoSchema.optional(),
  documents: driverApplicationDocumentsSchema.optional(),
  deliveryAreas: z.array(driverApplicationDeliveryAreaSchema).min(1, '최소 하나의 배달 구역을 선택해주세요').optional(),
  introduction: z.string().max(1000, '자기소개는 최대 1000자까지 가능합니다').optional()
});

/**
 * 배달기사 신청서 검토 요청 스키마
 */
export const reviewDriverApplicationRequestSchema = z.object({
  approved: z.boolean(),
  reviewComment: z.string().max(500, '검토 의견은 최대 500자까지 가능합니다').optional(),
  requiresAdditionalInfo: z.boolean().optional()
});

/**
 * 배달기사 신청서 목록 조회 쿼리 스키마
 */
export const getDriverApplicationsQuerySchema = z.object({
  status: driverApplicationStatusSchema.optional(),
  page: z.number().int().min(1, '페이지 번호는 1 이상이어야 합니다').optional(),
  limit: z.number().int().min(1, '페이지 크기는 1 이상이어야 합니다').max(100, '페이지 크기는 최대 100까지 가능합니다').optional(),
  search: z.string().max(100, '검색 키워드는 최대 100자까지 가능합니다').optional()
}); 