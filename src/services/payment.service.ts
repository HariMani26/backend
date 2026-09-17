import Razorpay from 'razorpay';
import { startSession } from 'mongoose';
import { MembershipPlanModel } from '@models/MembershipPlan.model';
import { PaymentModel } from '@models/Payment.model';
import { ProfileModel } from '@models/Profile.model';
import { NOT_DELETED } from '@models/User.model';
import { ApiError } from '@utils/ApiError';
import { assertCapturedPayment, validPaymentSignature } from '@utils/paymentVerification';
import { evaluateAccess } from './access.service';

export class PaymentService {
  private credentials() {
    const keyId = process.env.RAZORPAY_KEY_ID ?? '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    if (!keyId.startsWith('rzp_test_') || !keySecret) throw new ApiError(503, 'Test payment gateway is not configured');
    return { keyId, keySecret };
  }

  private gateway() {
    const { keyId, keySecret } = this.credentials();
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async summary(userId: string) {
    const [profile, plans, payments] = await Promise.all([
      ProfileModel.findOne({ userId, ...NOT_DELETED }),
      MembershipPlanModel.find({ isActive: true }).sort({ priceInr: 1 }),
      PaymentModel.find({ userId }).sort({ createdAt: -1 }).limit(50),
    ]);
    return {
      access: evaluateAccess(profile), accessTill: profile?.accessTill ?? null,
      verificationStatus: profile?.verificationStatus ?? null,
      gatewayReady: !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET,
      plans: plans.map((plan) => ({ id: String(plan._id), name: plan.name, priceInr: plan.priceInr, durationDays: plan.durationDays, features: plan.features })),
      payments: payments.map((payment) => ({ id: String(payment._id), orderId: payment.orderId, planName: payment.planName, amount: payment.amount, currency: payment.currency, status: payment.status, createdAt: payment.createdAt, accessTill: payment.accessTill ?? null })),
    };
  }

  async createOrder(userId: string, planId: string) {
    const credentials = this.credentials();
    const [profile, plan] = await Promise.all([
      ProfileModel.findOne({ userId, ...NOT_DELETED }), MembershipPlanModel.findOne({ _id: planId, isActive: true }),
    ]);
    if (!profile) throw ApiError.badRequest('Complete registration before making a payment');
    if (profile.marriageStatus.isMarried || ['suspended', 'rejected', 'refunded'].includes(profile.verificationStatus)) throw ApiError.forbidden('Contact support before renewing this account');
    if (!plan || plan.priceInr <= 0) throw ApiError.badRequest('Select an active paid plan');
    const amount = Math.round(plan.priceInr * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) throw ApiError.badRequest('Invalid plan price');
    const order = await this.gateway().orders.create({ amount, currency: 'INR', notes: { userId, planId } });
    await PaymentModel.create({ userId, planId, planName: plan.name, amount, currency: 'INR', durationDays: plan.durationDays, orderId: order.id });
    return { orderId: order.id, amount, currency: 'INR', keyId: credentials.keyId, planName: plan.name };
  }

  async verify(userId: string, orderId: string, paymentId: string, signature: string) {
    const order = await PaymentModel.findOne({ userId, orderId });
    if (!order) throw ApiError.notFound('Payment order not found');
    if (!validPaymentSignature(`${order.orderId}|${paymentId}`, signature, this.credentials().keySecret)) throw ApiError.badRequest('Invalid payment signature');
    await this.activate(order.orderId, paymentId);
    return this.summary(userId);
  }

  async activate(orderId: string, paymentId: string): Promise<void> {
    const authoritativePayment = await this.gateway().payments.fetch(paymentId);
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const order = await PaymentModel.findOne({ orderId }).session(session);
        if (!order) throw ApiError.notFound('Payment order not found');
        assertCapturedPayment(order, authoritativePayment);
        if (order.status === 'refunded') throw ApiError.conflict('This payment was refunded');
        if (order.appliedAt) {
          if (order.paymentId !== paymentId) throw ApiError.conflict('Order already fulfilled by a different payment');
          return;
        }
        const profile = await ProfileModel.findOne({ userId: order.userId, ...NOT_DELETED }).session(session);
        if (!profile) throw ApiError.notFound('Profile no longer available');
        const now = new Date();
        const startsAt = Math.max(now.getTime(), profile.accessTill?.getTime() ?? 0);
        const accessTill = new Date(startsAt + order.durationDays * 86400000);
        profile.accessTill = accessTill;
        await profile.save({ session });
        order.paymentId = paymentId;
        order.status = 'captured';
        order.appliedAt = now;
        order.accessTill = accessTill;
        await order.save({ session });
      });
    } finally { await session.endSession(); }
  }

  async webhook(body: Buffer, signature: string): Promise<void> {
    if (!validPaymentSignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET ?? '')) throw ApiError.badRequest('Invalid webhook signature');
    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } }; refund?: { entity?: { payment_id?: string } } } };
    try { event = JSON.parse(body.toString('utf8')); } catch { throw ApiError.badRequest('Invalid webhook body'); }
    const payment = event.payload?.payment?.entity;
    if (event.event === 'payment.captured' && payment?.id && payment.order_id) {
      if (await PaymentModel.exists({ orderId: payment.order_id })) await this.activate(payment.order_id, payment.id);
    }
    if (event.event === 'refund.processed') {
      const paymentId = event.payload?.refund?.entity?.payment_id;
      if (paymentId) await this.recordRefund(paymentId);
    }
  }

  async recordRefund(paymentId: string): Promise<void> {
    const payment = await this.gateway().payments.fetch(paymentId);
    if (!payment.order_id || Number(payment.amount_refunded ?? 0) <= 0) throw ApiError.conflict('Refund has not been confirmed');
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const order = await PaymentModel.findOne({ orderId: payment.order_id }).session(session);
        if (!order || order.status === 'refunded') return;
        order.paymentId = paymentId;
        order.status = 'refunded';
        await order.save({ session });
        await ProfileModel.updateOne({ userId: order.userId, ...NOT_DELETED }, { $set: { accessTill: new Date() } }, { session });
      });
    } finally { await session.endSession(); }
  }
}

export const paymentService = new PaymentService();