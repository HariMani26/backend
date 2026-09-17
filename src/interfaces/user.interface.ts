import { Role } from "@/enum/role.enum";
import { Types } from "mongoose";
import { CreatorBase } from "./creatorBase.interface";

export interface IUser extends CreatorBase {
  preferences?: { showPhoto: boolean; showContact: boolean; emailNotifications: boolean };
  mobile: string;
  countryCode: string;
  email?: string;
  passwordHash?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  role: Role;
  googleId?: string;
  appleId?: string;
  isActive: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  adminGrantedBy?: Types.ObjectId;
  adminGrantedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}