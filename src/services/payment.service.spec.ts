import { createHmac } from 'crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { PaymentModel } from '@models/Payment.model';
import { ProfileModel } from '@models/Profile.model';
import { assertCapturedPayment, validPaymentSignature } from '@utils/paymentVerification';
import { paymentService } from './payment.service';
import { MembershipPlanModel } from '@models/MembershipPlan.model';
import { seedMembershipPlans } from '../scripts/seed';

jest.mock('razorpay');

describe('Payment verification', () => {
  const expected = { orderId: 'order_123', amount: 2000, currency: 'INR' };
  const captured = { order_id: 'order_123', amount: 2000, currency: 'INR', status: 'captured', amount_refunded: 0 };

  it('accepts only a valid signature over the exact payload', () => {
    const payload = 'order_123|pay_123';
    const signature = createHmac('sha256', 'test-secret').update(payload).digest('hex');
    expect(validPaymentSignature(payload, signature, 'test-secret')).toBe(true);
    expect(validPaymentSignature('order_other|pay_123', signature, 'test-secret')).toBe(false);
    expect(validPaymentSignature(payload, 'not-hex', 'test-secret')).toBe(false);
    expect(validPaymentSignature(payload, signature, '')).toBe(false);
  });

  it('accepts an authoritative captured payment', () => {
    expect(() => assertCapturedPayment(expected, captured)).not.toThrow();
  });

  it('inserts the reference default without overwriting existing pricing', async () => {
    const update = jest.spyOn(MembershipPlanModel, 'updateOne').mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 0, upsertedCount: 0, upsertedId: null });
    await seedMembershipPlans();
    expect(update).toHaveBeenCalledWith({ name: 'Standard' }, { $setOnInsert: expect.objectContaining({ priceInr: 20, durationDays: 90 }) }, { upsert: true });
    update.mockRestore();
  });

  it.each([
    { order_id: 'order_other' }, { amount: 1 }, { currency: 'USD' },
    { status: 'authorized' }, { status: 'failed' }, { amount_refunded: 1 },
  ])('rejects mismatched, pending or refunded payments: %j', (change) => {
    expect(() => assertCapturedPayment(expected, { ...captured, ...change })).toThrow();
  });
});

describe('Payment fulfillment', () => {
  const originalEnvironment = { ...process.env };
  const fetchPayment = jest.fn();
  const session = { withTransaction: jest.fn(async (work: () => Promise<void>) => work()), endSession: jest.fn() };
  const payment = { id: 'pay_123', order_id: 'order_123', amount: 2000, currency: 'INR', status: 'captured', amount_refunded: 0 };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_local';
    process.env.RAZORPAY_KEY_SECRET = 'local-test-secret';
    (Razorpay as unknown as jest.Mock).mockImplementation(() => ({ payments: { fetch: fetchPayment } }));
    fetchPayment.mockResolvedValue(payment);
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(session as unknown as mongoose.ClientSession);
  });
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); process.env = { ...originalEnvironment }; });

  it('extends membership once without changing verification', async () => {
    const order = new PaymentModel({ orderId: 'order_123', amount: 2000, currency: 'INR', durationDays: 90, userId: '507f1f77bcf86cd799439011' });
    const future = new Date(Date.now() + 86400000);
    const profile = new ProfileModel({ verificationStatus: 'unverified', accessTill: future });
    jest.spyOn(PaymentModel, 'findOne').mockReturnValue({ session: jest.fn().mockResolvedValue(order) } as never);
    const findProfile = jest.spyOn(ProfileModel, 'findOne').mockReturnValue({ session: jest.fn().mockResolvedValue(profile) } as never);
    const saveOrder = jest.spyOn(order, 'save').mockResolvedValue(order);
    const saveProfile = jest.spyOn(profile, 'save').mockResolvedValue(profile);
    await paymentService.activate('order_123', 'pay_123');
    await paymentService.activate('order_123', 'pay_123');
    expect(profile.accessTill?.getTime()).toBe(future.getTime() + 90 * 86400000);
    expect(profile.verificationStatus).toBe('unverified');
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(saveOrder).toHaveBeenCalledTimes(1);
    expect(findProfile).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(2);
  });

  it('never updates a profile when capture details mismatch', async () => {
    fetchPayment.mockResolvedValue({ ...payment, amount: 1 });
    const order = new PaymentModel({ orderId: 'order_123', amount: 2000, currency: 'INR' });
    jest.spyOn(PaymentModel, 'findOne').mockReturnValue({ session: jest.fn().mockResolvedValue(order) } as never);
    const findProfile = jest.spyOn(ProfileModel, 'findOne');
    await expect(paymentService.activate('order_123', 'pay_123')).rejects.toThrow('does not match');
    expect(findProfile).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('rejects another member\'s order before gateway verification', async () => {
    const findOrder = jest.spyOn(PaymentModel, 'findOne').mockResolvedValue(null);
    await expect(paymentService.verify('caller', 'order_123', 'pay_123', 'signature')).rejects.toThrow('not found');
    expect(findOrder).toHaveBeenCalledWith({ userId: 'caller', orderId: 'order_123' });
    expect(fetchPayment).not.toHaveBeenCalled();
  });

  it('cannot use live credentials', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_live_disallowed';
    await expect(paymentService.createOrder('caller', 'plan')).rejects.toThrow('not configured');
  });

  it('rejects unsigned webhooks without touching orders', async () => {
    const exists = jest.spyOn(PaymentModel, 'exists');
    await expect(paymentService.webhook(Buffer.from('{}'), 'bad-signature')).rejects.toThrow('Invalid webhook');
    expect(exists).not.toHaveBeenCalled();
  });
});