import crypto from 'crypto';

import { HydratedDocument } from 'mongoose';

import { env } from '@config/env';
import { IUser } from '@models/User.model';
import { userRepository } from '@repositories/user.repository';
import { mailService } from '@services/mail.service';
import { oauthProviderService } from '@services/oauthProvider.service';
import { otpService } from '@services/otp.service';
import { RequestMeta, TokenPair, tokenService } from '@services/token.service';
import { ApiError } from '@utils/ApiError';
import { sha256Hex } from '@utils/hash';
import { compareSecret, hashSecret } from '@utils/password';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function assertActive(user: HydratedDocument<IUser>): void {
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been suspended. Please contact support.');
  }
}

export const authService = {
  requestOtp(mobile: string): Promise<void> {
    return otpService.sendOtp(mobile, 'login');
  },

  /** Single phone+OTP flow handles both first-time registration and returning login. */
  async verifyOtpAndAuthenticate(
    mobile: string,
    code: string,
    meta: RequestMeta,
  ): Promise<{ user: HydratedDocument<IUser>; tokens: TokenPair; isNewUser: boolean }> {
    await otpService.verifyOtp(mobile, 'login', code);

    let user = await userRepository.findByMobile(mobile);
    let isNewUser = false;

    if (!user) {
      user = await userRepository.create({
        mobile,
        countryCode: '+91',
        isPhoneVerified: true,
        lastLoginAt: new Date(),
      });
      isNewUser = true;
    } else {
      assertActive(user);
      user = (await userRepository.markPhoneVerified(user._id)) ?? user;
    }

    const tokens = await tokenService.issueTokenPair(String(user._id), user.role, meta);
    return { user, tokens, isNewUser };
  },

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<{ tokens: TokenPair; user: HydratedDocument<IUser> }> {
    const rotated = await tokenService.rotateRefreshToken(rawRefreshToken, meta);
    const user = await userRepository.findById(rotated.userId);

    if (!user || !user.isActive) {
      await tokenService.revokeRefreshToken(rotated.refreshToken);
      throw ApiError.unauthorized('Account not found or inactive');
    }

    const accessToken = tokenService.signAccessTokenFor(String(user._id), user.role);
    return { tokens: { accessToken, refreshToken: rotated.refreshToken }, user };
  },

  logout(rawRefreshToken: string): Promise<void> {
    return tokenService.revokeRefreshToken(rawRefreshToken);
  },

  async adminLogin(email: string, password: string, meta: RequestMeta): Promise<{ user: HydratedDocument<IUser>; tokens: TokenPair }> {
    const user = await userRepository.findByEmailWithSecret(email);
    if (!user?.passwordHash || !['admin', 'superAdmin'].includes(user.role)) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    assertActive(user);

    const matches = await compareSecret(password, user.passwordHash);
    if (!matches) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    await userRepository.updateById(user._id, { lastLoginAt: new Date() });
    const tokens = await tokenService.issueTokenPair(String(user._id), user.role, meta);
    return { user, tokens };
  },

  /** Always resolves — the controller returns a generic message either way, to avoid leaking which emails exist. */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    await userRepository.setResetPasswordToken(user._id, sha256Hex(rawToken), new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const resetLink = `${env.CORS_ORIGIN}/reset-password?token=${rawToken}`;
    await mailService.send({
      to: email,
      subject: 'Reset your WeOur Matrimony password',
      text: `Reset your password using this link (valid 30 minutes): ${resetLink}`,
      html: `<p>Reset your password using the link below (valid 30 minutes).</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByResetTokenHash(sha256Hex(rawToken));
    if (!user) {
      throw ApiError.badRequest('This reset link is invalid or has expired');
    }

    await userRepository.setPassword(user._id, await hashSecret(newPassword));
    await userRepository.clearResetPasswordToken(user._id);
    await tokenService.revokeAllForUser(String(user._id));
  },

  async googleLogin(idToken: string, meta: RequestMeta): Promise<{ user: HydratedDocument<IUser>; tokens: TokenPair }> {
    const identity = await oauthProviderService.verifyGoogleIdToken(idToken);
    const user = await linkOrFindOAuthUser('googleId', identity);
    const tokens = await tokenService.issueTokenPair(String(user._id), user.role, meta);
    return { user, tokens };
  },

  async appleLogin(idToken: string, meta: RequestMeta): Promise<{ user: HydratedDocument<IUser>; tokens: TokenPair }> {
    const identity = await oauthProviderService.verifyAppleIdToken(idToken);
    const user = await linkOrFindOAuthUser('appleId', identity);
    const tokens = await tokenService.issueTokenPair(String(user._id), user.role, meta);
    return { user, tokens };
  },
};

async function linkOrFindOAuthUser(
  provider: 'googleId' | 'appleId',
  identity: { providerId: string; email?: string },
): Promise<HydratedDocument<IUser>> {
  const finder = provider === 'googleId' ? userRepository.findByGoogleId : userRepository.findByAppleId;
  let user = await finder(identity.providerId);

  if (!user && identity.email) {
    const byEmail = await userRepository.findByEmail(identity.email);
    if (byEmail) {
      const patch = provider === 'googleId' ? { googleId: identity.providerId } : { appleId: identity.providerId };
      user = (await userRepository.updateById(byEmail._id, patch)) ?? byEmail;
    }
  }

  if (!user) {
    // Mobile number is this platform's primary identity (matches the design's WOM reference-ID
    // scheme) — Google/Apple can only link to an existing account, not create one outright.
    throw ApiError.badRequest(
      'No account found for this sign-in. Please register with your mobile number first, then link this account from Settings.',
    );
  }

  assertActive(user);
  await userRepository.updateById(user._id, { lastLoginAt: new Date() });
  return user;
}
