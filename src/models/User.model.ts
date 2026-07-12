import { Schema, model, Types } from 'mongoose';

export type UserRole = 'user' | 'admin' | 'superAdmin';

export interface IUser {
  mobile: string;
  countryCode: string;
  email?: string;
  passwordHash?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  role: UserRole;
  googleId?: string;
  appleId?: string;
  isActive: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  adminGrantedBy?: Types.ObjectId;
  adminGrantedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const userSchema = new Schema<IUser>(
  {
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    countryCode: { type: String, required: true, default: '+91' },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    passwordHash: { type: String, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    role: { type: String, enum: ['user', 'admin', 'superAdmin'], default: 'user', index: true },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    isActive: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    adminGrantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminGrantedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', userSchema);

/** Default filter every repository read should apply — soft-deleted users are excluded explicitly rather than via query middleware, to keep the exclusion visible at the call site. */
export const NOT_DELETED = { isDeleted: { $ne: true } };
