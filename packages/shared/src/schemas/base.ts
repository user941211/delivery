/**
 * 기본 Zod 스키마 정의
 */

import { z } from 'zod';

/**
 * 기본 엔티티 스키마
 */
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

/**
 * 페이지네이션 메타 스키마
 */
export const paginationMetaSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasPrevious: z.boolean(),
  hasNext: z.boolean()
});

/**
 * 페이지네이션 응답 스키마
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema
  });

/**
 * 주소 스키마
 */
export const addressSchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/, '우편번호는 5자리 숫자여야 합니다'),
  province: z.string().min(1, '시/도를 입력해주세요'),
  city: z.string().min(1, '시/구를 입력해주세요'),
  district: z.string().min(1, '구/동을 입력해주세요'),
  detail: z.string().min(1, '상세주소를 입력해주세요'),
  fullAddress: z.string()
});

/**
 * 연락처 정보 스키마
 */
export const contactInfoSchema = z.object({
  phone: z.string().regex(/^01[016789]\d{7,8}$/, '올바른 휴대폰 번호를 입력해주세요').optional(),
  email: z.string().email('올바른 이메일 주소를 입력해주세요').optional(),
  alternativePhone: z.string().optional()
});

/**
 * 평점 정보 스키마
 */
export const ratingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().min(0),
  distribution: z.object({
    1: z.number().min(0),
    2: z.number().min(0),
    3: z.number().min(0),
    4: z.number().min(0),
    5: z.number().min(0)
  })
});

/**
 * 파일 정보 스키마
 */
export const fileInfoSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  url: z.string().url(),
  uploadedAt: z.date()
}); 