import { createHmac, timingSafeEqual } from 'crypto';
import { ApiError } from './ApiError';

export function validPaymentSignature(payload: string | Buffer, signature: string, secret: string): boolean {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function assertCapturedPayment(
  expected: { orderId: string; amount: number; currency: string },
  actual: { order_id?: string; amount: number | string; currency: string; status: string; amount_refunded?: number },
): void {
  if (actual.order_id !== expected.orderId || Number(actual.amount) !== expected.amount || actual.currency !== expected.currency) {
    throw ApiError.badRequest('Payment does not match this order');
  }
  if (actual.status !== 'captured' || Number(actual.amount_refunded ?? 0) !== 0) {
    throw ApiError.conflict('Payment is not captured or has been refunded');
  }
}