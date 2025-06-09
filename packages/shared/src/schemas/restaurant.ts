/**
 * 음식점 관련 Zod 스키마 정의
 */

import { z } from 'zod';
import { baseEntitySchema, addressSchema, ratingSchema } from './base';

/**
 * 음식점 상태 스키마
 */
export const restaurantStatusSchema = z.enum(['open', 'closed', 'busy', 'temporarily_closed']);

/**
 * 음식점 카테고리 스키마
 */
export const restaurantCategorySchema = z.enum([
  'korean', 'chinese', 'japanese', 'western', 'chicken', 'pizza', 
  'burger', 'asian', 'cafe', 'dessert', 'other'
]);

/**
 * 메뉴 아이템 스키마
 */
export const menuItemSchema = baseEntitySchema.extend({
  name: z.string().min(1, '메뉴명을 입력해주세요'),
  description: z.string().optional(),
  price: z.number().positive('가격은 0보다 커야 합니다'),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean(),
  preparationTime: z.number().min(0).optional(),
  isPopular: z.boolean().optional()
});

/**
 * 음식점 생성 요청 스키마
 */
export const createRestaurantRequestSchema = z.object({
  name: z.string().min(1, '음식점 이름을 입력해주세요'),
  description: z.string().optional(),
  category: restaurantCategorySchema,
  phoneNumber: z.string().regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, '올바른 전화번호를 입력해주세요'),
  address: addressSchema,
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }),
  minimumOrderAmount: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional()
}); 