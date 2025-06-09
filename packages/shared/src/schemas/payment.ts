/**
 * 결제 관련 Zod 스키마 정의
 */

import { z } from 'zod';
import { baseEntitySchema } from './base';

/**
 * 결제 상태 스키마
 */
export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded'
]);

/**
 * 한국 결제 게이트웨이 스키마
 */
export const paymentGatewaySchema = z.enum([
  'toss',
  'kg_inicis',
  'kakao_pay',
  'naver_pay',
  'payco'
]);

/**
 * 결제 생성 요청 스키마
 */
export const createPaymentRequestSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive('결제 금액은 0보다 커야 합니다'),
  currency: z.string().default('KRW'),
  paymentMethod: z.enum([
    'credit_card',
    'debit_card', 
    'bank_transfer',
    'mobile_payment',
    'cash_on_delivery',
    'digital_wallet'
  ]),
  gateway: paymentGatewaySchema.optional(),
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string()
  }),
  metadata: z.record(z.any()).optional()
}); 