/**
 * 주문 관련 Zod 스키마 정의
 */

import { z } from 'zod';
import { baseEntitySchema } from './base';

/**
 * 주문 상태 스키마
 */
export const orderStatusSchema = z.enum([
  'pending',
  'confirmed', 
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'delivering',
  'delivered',
  'cancelled',
  'refunded'
]);

/**
 * 주문 타입 스키마
 */
export const orderTypeSchema = z.enum(['delivery', 'pickup', 'dine_in']);

/**
 * 결제 방식 스키마
 */
export const paymentMethodSchema = z.enum([
  'credit_card',
  'debit_card', 
  'bank_transfer',
  'mobile_payment',
  'cash_on_delivery',
  'digital_wallet'
]);

/**
 * 주문 생성 요청 스키마
 */
export const createOrderRequestSchema = z.object({
  restaurantId: z.string().uuid(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().min(1),
    options: z.array(z.string().uuid()).optional(),
    specialInstructions: z.string().optional()
  })).min(1, '주문할 상품을 선택해주세요'),
  deliveryAddress: z.object({
    zipCode: z.string(),
    fullAddress: z.string(),
    detailAddress: z.string(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  specialInstructions: z.string().optional(),
  paymentMethod: paymentMethodSchema,
  orderType: orderTypeSchema
}); 