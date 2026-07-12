import {
  adminLoginSchema,
  forgotPasswordSchema,
  oauthLoginSchema,
  refreshTokenSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '@dto/auth.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateRequestOtp = validateRequest({ body: requestOtpSchema });
export const validateVerifyOtp = validateRequest({ body: verifyOtpSchema });
export const validateRefreshToken = validateRequest({ body: refreshTokenSchema });
export const validateAdminLogin = validateRequest({ body: adminLoginSchema });
export const validateForgotPassword = validateRequest({ body: forgotPasswordSchema });
export const validateResetPassword = validateRequest({ body: resetPasswordSchema });
export const validateOAuthLogin = validateRequest({ body: oauthLoginSchema });
