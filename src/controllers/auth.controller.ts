import { Request, Response } from 'express';

import { sendSuccess } from '@helpers/apiResponse';
import { userRepository } from '@repositories/user.repository';
import { authService } from '@services/auth.service';
import { RequestMeta } from '@services/token.service';
import { ApiError } from '@utils/ApiError';
import { asyncHandler } from '@utils/asyncHandler';
import { toPublicUser } from '@utils/serializers';

function requestMeta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

export const authController = {
  requestOtp: asyncHandler(async (req: Request, res: Response) => {
    await authService.requestOtp(req.body.mobile);
    sendSuccess(res, null, 'OTP sent successfully');
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens, isNewUser } = await authService.verifyOtpAndAuthenticate(req.body.mobile, req.body.code, requestMeta(req));
    sendSuccess(
      res,
      { user: toPublicUser(user), ...tokens, isNewUser },
      isNewUser ? 'Registered and logged in successfully' : 'Logged in successfully',
    );
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { tokens, user } = await authService.refresh(req.body.refreshToken, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), ...tokens }, 'Token refreshed');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  }),

  adminLogin: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.adminLogin(req.body.email, req.body.password, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), ...tokens }, 'Logged in successfully');
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If an account exists for that email, a reset link has been sent');
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    sendSuccess(res, null, 'Password reset successfully. Please log in again.');
  }),

  googleLogin: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.googleLogin(req.body.idToken, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), ...tokens }, 'Logged in successfully');
  }),

  appleLogin: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.appleLogin(req.body.idToken, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), ...tokens }, 'Logged in successfully');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    sendSuccess(res, toPublicUser(user), 'Current user');
  }),
};
