import { Types } from 'mongoose';

import { RefreshTokenModel } from '@models/RefreshToken.model';

export const refreshTokenRepository = {
  create(input: {
    userId: Types.ObjectId | string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    return RefreshTokenModel.create(input);
  },

  findActiveByTokenHash(tokenHash: string) {
    return RefreshTokenModel.findOne({ tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  },

  revoke(id: Types.ObjectId | string, replacedByTokenHash?: string) {
    return RefreshTokenModel.findByIdAndUpdate(id, { $set: { revokedAt: new Date(), replacedByTokenHash } }, { new: true });
  },

  revokeFamily(family: string) {
    return RefreshTokenModel.updateMany({ family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  },

  revokeAllForUser(userId: Types.ObjectId | string) {
    return RefreshTokenModel.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  },
};
