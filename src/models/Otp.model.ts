import { Schema, model } from 'mongoose';

export type OtpPurpose = 'register' | 'login' | 'reset-password' | 'delete-account';

export interface IOtp {
  mobile: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    mobile: { type: String, required: true, trim: true, index: true },
    purpose: { type: String, enum: ['register', 'login', 'reset-password', 'delete-account'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

otpSchema.index({ mobile: 1, purpose: 1 });
// TTL cleanup — expired OTP documents are purged automatically.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = model<IOtp>('Otp', otpSchema);
