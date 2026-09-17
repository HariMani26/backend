import crypto from "crypto";

import { Role } from "@/enum/role.enum";
import { IUser, NOT_DELETED, UserCollection } from "@models/User.model";
import { HydratedDocument } from "mongoose";

import { mailService } from "@services/mail.service";
import { otpService } from "@services/otp.service";
import { RequestMeta, TokenPair, tokenService } from "@services/token.service";
import { ApiError } from "@utils/ApiError";
import { sha256Hex } from "@utils/hash";
import { compareSecret, hashSecret } from "@utils/password";
import { Container, Service } from "typedi";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function assertActive(user: HydratedDocument<IUser>): void {
  if (!user.isActive) {
    throw ApiError.forbidden(
      "This account has been suspended. Please contact support.",
    );
  }
}

@Service()
export class AuthService {
  constructor() {}

  public async getCurrentUser(userId: string): Promise<HydratedDocument<IUser>> {
    const user = await UserCollection.findOne({ _id: userId, ...NOT_DELETED });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account not found or inactive");
    }
    return user;
  }

  public async requestOtp(mobile: string): Promise<void> {
    return otpService.sendOtp(mobile, "login");
  }

  public async verifyOtpAndAuthenticate(
    mobile: string,
    code: string,
    meta: RequestMeta,
  ): Promise<{
    user: HydratedDocument<IUser>;
    tokens: TokenPair;
    isNewUser: boolean;
  }> {
    await otpService.verifyOtp(mobile, "login", code);

    let user = await UserCollection.findOne({ mobile, ...NOT_DELETED });
    let isNewUser = false;

    if (!user) {
      user = await UserCollection.create({
        mobile,
        countryCode: "+91",
        isPhoneVerified: true,
        lastLoginAt: new Date(),
      });
      isNewUser = true;
    } else {
      assertActive(user);
      user =
        (await UserCollection.findOneAndUpdate(
          { _id: user._id, ...NOT_DELETED },
          { $set: { isPhoneVerified: true, lastLoginAt: new Date() } },
          { new: true },
        )) ?? user;
    }

    const tokens = await tokenService.issueTokenPair(
      String(user._id),
      user.role,
      meta,
    );
    return { user, tokens, isNewUser };
  }

  public async refresh(
    rawRefreshToken: string,
    meta: RequestMeta,
  ): Promise<{ tokens: TokenPair; user: HydratedDocument<IUser> }> {
    const rotated = await tokenService.rotateRefreshToken(
      rawRefreshToken,
      meta,
    );
    const user = await UserCollection.findOne({
      _id: rotated.userId,
      ...NOT_DELETED,
    });

    if (!user || !user.isActive) {
      await tokenService.revokeRefreshToken(rotated.refreshToken);
      throw ApiError.unauthorized("Account not found or inactive");
    }

    const accessToken = tokenService.signAccessTokenFor(
      String(user._id),
      user.role,
    );
    return {
      tokens: { accessToken, refreshToken: rotated.refreshToken },
      user,
    };
  }

  public async logout(rawRefreshToken: string): Promise<void> {
    return tokenService.revokeRefreshToken(rawRefreshToken);
  }

  /** Email+password login, restricted to admin/super-admin accounts. */
  public async adminLogin(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<{ user: HydratedDocument<IUser>; tokens: TokenPair }> {
    const user = await UserCollection.findOne({
      email: email.toLowerCase(),
      ...NOT_DELETED,
    }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (user.role !== Role.Admin && user.role !== Role.SuperAdmin) {
      throw ApiError.forbidden("This account does not have admin access");
    }

    assertActive(user);

    const passwordMatches = await compareSecret(password, user.passwordHash);
    if (!passwordMatches) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issueTokenPair(
      String(user._id),
      user.role,
      meta,
    );
    return { user, tokens };
  }

  /** Always resolves without revealing whether the email exists, to avoid account enumeration. */
  public async forgotPassword(email: string): Promise<void> {
    const user = await UserCollection.findOne({
      email: email.toLowerCase(),
      ...NOT_DELETED,
    });
    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordTokenHash = sha256Hex(resetToken);
    const resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await UserCollection.findOneAndUpdate(
      { _id: user._id, ...NOT_DELETED },
      { $set: { resetPasswordTokenHash, resetPasswordExpiresAt } },
    );

    await mailService.send({
      to: user.email as string,
      subject: "Reset your WeOur Matrimony password",
      text: `Use this token to reset your password: ${resetToken}. It expires in 30 minutes.`,
      html: `<p>Use this token to reset your password: <strong>${resetToken}</strong></p><p>It expires in 30 minutes.</p>`,
    });
  }

  public async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const resetPasswordTokenHash = sha256Hex(token);
    const user = await UserCollection.findOne({
      resetPasswordTokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      ...NOT_DELETED,
    }).select("+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt");

    if (!user) {
      throw ApiError.badRequest("Reset token is invalid or has expired");
    }

    user.passwordHash = await hashSecret(newPassword);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await tokenService.revokeAllForUser(String(user._id));
  }
}

export const authService = Container.get(AuthService);
