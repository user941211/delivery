/**
 * 배달 관련 Zod 스키마 정의
 */

import { z } from 'zod';
import { baseEntitySchema } from './base';

/**
 * 배달 상태 스키마
 */
export const deliveryStatusSchema = z.enum([
  'pending',
  'assigned',
  'picked_up',
  'delivering',
  'delivered',
  'failed',
  'cancelled'
]);

/**
 * 좌표 스키마
 */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

/**
 * 배달 생성 요청 스키마
 */
export const createDeliveryRequestSchema = z.object({
  orderId: z.string().uuid(),
  pickupAddress: z.object({
    fullAddress: z.string(),
    coordinates: coordinatesSchema
  }),
  deliveryAddress: z.object({
    fullAddress: z.string(),
    coordinates: coordinatesSchema,
    recipientName: z.string(),
    recipientPhone: z.string()
  }),
  estimatedTime: z.number().min(0),
  deliveryInstructions: z.string().optional()
}); 