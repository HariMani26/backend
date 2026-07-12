import { Router } from 'express';

import { authController } from '@controllers/auth.controller';
import { authenticate } from '@middlewares/authenticate';
import { authRateLimiter } from '@middlewares/rateLimiter';
import {
  validateAdminLogin,
  validateForgotPassword,
  validateOAuthLogin,
  validateRefreshToken,
  validateRequestOtp,
  validateResetPassword,
  validateVerifyOtp,
} from '@validators/auth.validator';

export const authRouter = Router();

/**
 * @openapi
 * /auth/otp/request:
 *   post:
 *     summary: Send a one-time password to a mobile number (used for both registration and login)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RequestOtpDto' }
 *     responses:
 *       200: { description: OTP sent }
 */
authRouter.post('/otp/request', authRateLimiter, validateRequestOtp, authController.requestOtp);

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     summary: Verify an OTP — creates the account on first success, logs in otherwise
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyOtpDto' }
 *     responses:
 *       200: { description: Authenticated }
 */
authRouter.post('/otp/verify', authRateLimiter, validateVerifyOtp, authController.verifyOtp);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access/refresh token pair
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenDto' }
 *     responses:
 *       200: { description: Token refreshed }
 */
authRouter.post('/refresh', validateRefreshToken, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenDto' }
 *     responses:
 *       200: { description: Logged out }
 */
authRouter.post('/logout', validateRefreshToken, authController.logout);

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     summary: Email/password login for admin and super-admin accounts
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AdminLoginDto' }
 *     responses:
 *       200: { description: Authenticated }
 */
authRouter.post('/admin/login', authRateLimiter, validateAdminLogin, authController.adminLogin);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email (admin accounts only)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordDto' }
 *     responses:
 *       200: { description: Generic confirmation, regardless of whether the email exists }
 */
authRouter.post('/forgot-password', authRateLimiter, validateForgotPassword, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset a password using the token emailed by /forgot-password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordDto' }
 *     responses:
 *       200: { description: Password reset }
 */
authRouter.post('/reset-password', authRateLimiter, validateResetPassword, authController.resetPassword);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: Sign in with a verified Google ID token (links to an existing mobile-registered account)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OAuthLoginDto' }
 *     responses:
 *       200: { description: Authenticated }
 */
authRouter.post('/google', authRateLimiter, validateOAuthLogin, authController.googleLogin);

/**
 * @openapi
 * /auth/apple:
 *   post:
 *     summary: Sign in with a verified Apple ID token (links to an existing mobile-registered account)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OAuthLoginDto' }
 *     responses:
 *       200: { description: Authenticated }
 */
authRouter.post('/apple', authRateLimiter, validateOAuthLogin, authController.appleLogin);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     responses:
 *       200: { description: Current user }
 */
authRouter.get('/me', authenticate, authController.me);
