import { Schema, Types, model } from 'mongoose';

export interface IPayment {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  amount: number;
  currency: string;
  durationDays: number;
  orderId: string;
  paymentId?: string;
  status: 'created' | 'captured' | 'refunded';
  appliedAt?: Date;
  accessTill?: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, required: true, enum: ['INR'] },
  durationDays: { type: Number, required: true, min: 1 },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['created', 'captured', 'refunded'], default: 'created' },
  appliedAt: Date,
  accessTill: Date,
}, { timestamps: true });

export const PaymentModel = model<IPayment>('Payment', paymentSchema);