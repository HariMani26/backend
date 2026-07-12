import { z } from 'zod';

import { env } from '@config/env';

const mobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 10, { message: 'Mobile number must be exactly 10 digits' });

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'OTP must be numeric')
  .refine((value) => value.length === env.OTP_LENGTH, { message: `OTP must be ${env.OTP_LENGTH} digits` });

/**
 * @openapi
 * components:
 *   schemas:
 *     RequestOtpDto:
 *       type: object
 *       required: [mobile]
 *       properties:
 *         mobile:
 *           type: string
 *           example: "9876543210"
 */
export const requestOtpSchema = z.object({
  mobile: mobileSchema,
});
export type RequestOtpBody = z.infer<typeof requestOtpSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     VerifyOtpDto:
 *       type: object
 *       required: [mobile, code]
 *       properties:
 *         mobile:
 *           type: string
 *           example: "9876543210"
 *         code:
 *           type: string
 *           example: "123456"
 */
export const verifyOtpSchema = z.object({
  mobile: mobileSchema,
  code: otpCodeSchema,
});
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     RefreshTokenDto:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     AdminLoginDto:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 */
export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type AdminLoginBody = z.infer<typeof adminLoginSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     ForgotPasswordDto:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     ResetPasswordDto:
 *       type: object
 *       required: [token, newPassword]
 *       properties:
 *         token:
 *           type: string
 *         newPassword:
 *           type: string
 *           format: password
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     OAuthLoginDto:
 *       type: object
 *       required: [idToken]
 *       properties:
 *         idToken:
 *           type: string
 */
export const oauthLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});
export type OAuthLoginBody = z.infer<typeof oauthLoginSchema>;
