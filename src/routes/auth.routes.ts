import { Router } from "express";

import { AuthController } from "@/controllers/auth.controller";
import { Routes } from "@/interfaces/routes.interface";
import { authRateLimiter } from "@middlewares/rateLimiter";
import { asyncHandler } from "@utils/asyncHandler";
import {
  validateAdminLogin,
  validateForgotPassword,
  validateRefreshToken,
  validateRequestOtp,
  validateResetPassword,
  validateVerifyOtp,
} from "@validators/auth.validator";

export class AuthRoute implements Routes {
  public path = "/auth";
  public router = Router();
  public auth = new AuthController();

  constructor() {
    this.initializeRoutes();
  }
  private initializeRoutes() {
    this.router.post(
      "/otp/request",
      authRateLimiter,
      validateRequestOtp,
      asyncHandler(this.auth.requestOtp),
    );

    this.router.post(
      "/otp/verify",
      authRateLimiter,
      validateVerifyOtp,
      asyncHandler(this.auth.verifyOtp),
    );

    this.router.post(
      "/refresh",
      validateRefreshToken,
      asyncHandler(this.auth.refresh),
    );

    this.router.post(
      "/logout",
      validateRefreshToken,
      asyncHandler(this.auth.logout),
    );

    this.router.post(
      "/admin/login",
      authRateLimiter,
      validateAdminLogin,
      asyncHandler(this.auth.adminLogin),
    );

    this.router.post(
      "/forgot-password",
      authRateLimiter,
      validateForgotPassword,
      asyncHandler(this.auth.forgotPassword),
    );

    this.router.post(
      "/reset-password",
      authRateLimiter,
      validateResetPassword,
      asyncHandler(this.auth.resetPassword),
    );
  }
}

export const authRouter = new AuthRoute().router;
