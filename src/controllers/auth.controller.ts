import { Request, Response } from "express";

import { sendSuccess } from "@helpers/apiResponse";

import { RequestMeta } from "@services/token.service";

import { toPublicUser } from "@utils/serializers";
import { Container } from "typedi";
import { AuthService } from "@/services/auth.service";

function requestMeta(req: Request): RequestMeta {
  return { userAgent: req.headers["user-agent"], ip: req.ip };
}

export class AuthController {
  private authService = Container.get(AuthService);

  public me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.authService.getCurrentUser(req.user!.id);
    sendSuccess(res, toPublicUser(user), "Current user");
  };

  public requestOtp = async (req: Request, res: Response): Promise<void> => {
    await this.authService.requestOtp(req.body.mobile);
    sendSuccess(res, null, "OTP sent successfully");
  };

  public verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { user, tokens, isNewUser } =
      await this.authService.verifyOtpAndAuthenticate(
        req.body.mobile,
        req.body.code,
        requestMeta(req),
      );
    sendSuccess(
      res,
      { user: toPublicUser(user), ...tokens, isNewUser },
      isNewUser
        ? "Registered and logged in successfully"
        : "Logged in successfully",
    );
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const { tokens, user } = await this.authService.refresh(
      req.body.refreshToken,
      requestMeta(req),
    );
    sendSuccess(
      res,
      { user: toPublicUser(user), ...tokens },
      "Token refreshed",
    );
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(req.body.refreshToken);
    sendSuccess(res, null, "Logged out successfully");
  };

  public adminLogin = async (req: Request, res: Response): Promise<void> => {
    const { user, tokens } = await this.authService.adminLogin(
      req.body.email,
      req.body.password,
      requestMeta(req),
    );
    sendSuccess(
      res,
      { user: toPublicUser(user), ...tokens },
      "Logged in successfully",
    );
  };

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.forgotPassword(req.body.email);
    sendSuccess(
      res,
      null,
      "If an account exists for that email, a reset link has been sent",
    );
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.resetPassword(req.body.token, req.body.newPassword);
    sendSuccess(res, null, "Password reset successfully. Please log in again.");
  };
}

