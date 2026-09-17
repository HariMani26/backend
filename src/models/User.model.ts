import { Role } from "@/enum/role.enum";
import { IUser } from "@/interfaces/user.interface";
import { Document, model, Schema } from "mongoose";

export type { IUser };
export type UserRole = Role;

const UserSchema: Schema = new Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    countryCode: { type: String, required: true, default: "+91" },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    passwordHash: { type: String, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    role: {
      type: String,
      enum: Role,
      default: "user",
      index: true,
    },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    isActive: { type: Boolean, default: true },
    preferences: {
      showPhoto: { type: Boolean, default: true },
      showContact: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
    },
    isPhoneVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    adminGrantedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adminGrantedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const UserCollection = model<IUser & Document>("User", UserSchema);

UserSchema.index({ createdAt: 1, updatedAt: 1 });
/** Default filter every direct model read should apply — soft-deleted users are excluded explicitly rather than via query middleware, to keep the exclusion visible at the call site. */
export const NOT_DELETED = { isDeleted: { $ne: true } };

export { UserCollection, UserCollection as UserModel, UserSchema };
