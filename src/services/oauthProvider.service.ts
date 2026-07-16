import { APPLE_CLIENT_ID, GOOGLE_CLIENT_ID } from "@config";
import { ApiError } from "@utils/ApiError";
import { verifyOidcIdToken } from "@utils/oidcVerifier";

export interface OAuthIdentity {
  providerId: string;
  email?: string;
}

function extractEmail(payload: Record<string, unknown>): string | undefined {
  return typeof payload.email === "string" ? payload.email : undefined;
}

export const oauthProviderService = {
  async verifyGoogleIdToken(idToken: string): Promise<OAuthIdentity> {
    if (!GOOGLE_CLIENT_ID) {
      throw ApiError.badRequest(
        "Google login is not configured on this server",
      );
    }

    try {
      const payload = await verifyOidcIdToken({
        idToken,
        jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
        issuer: "https://accounts.google.com",
        audience: GOOGLE_CLIENT_ID,
      });
      if (!payload.sub) {
        throw new Error("Google ID token is missing a sub claim");
      }
      return { providerId: payload.sub, email: extractEmail(payload) };
    } catch (error) {
      throw ApiError.unauthorized(
        `Invalid Google ID token: ${(error as Error).message}`,
      );
    }
  },

  async verifyAppleIdToken(idToken: string): Promise<OAuthIdentity> {
    if (!APPLE_CLIENT_ID) {
      throw ApiError.badRequest("Apple login is not configured on this server");
    }

    try {
      const payload = await verifyOidcIdToken({
        idToken,
        jwksUri: "https://appleid.apple.com/auth/keys",
        issuer: "https://appleid.apple.com",
        audience: APPLE_CLIENT_ID,
      });
      if (!payload.sub) {
        throw new Error("Apple ID token is missing a sub claim");
      }
      return { providerId: payload.sub, email: extractEmail(payload) };
    } catch (error) {
      throw ApiError.unauthorized(
        `Invalid Apple ID token: ${(error as Error).message}`,
      );
    }
  },
};
