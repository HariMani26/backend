import { config } from "dotenv";
config();

process.env;
export const { MongoDB_URL, DB_NAME } = process.env;
export const { NODE_ENV, PORT, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN } =
  process.env;

//User Default Password
export const { DEFAULT_PASS } = process.env;

// Environment Specific Config
export const ENVIRONMENT = process.env.ENVIRONMENT;

//Jwt Config
export const { JWT_SECRET, JWT_EXPIRY } = process.env;
export const CREDENTIALS = process.env.CREDENTIALS === "true";
// Auth token pair (falls back to JWT_SECRET/JWT_EXPIRY above when a dedicated
// access/refresh secret isn't configured, so a single JWT_SECRET still works locally).
export const {
  JWT_ACCESS_SECRET = JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN = JWT_EXPIRY || "15m",
  JWT_REFRESH_SECRET = JWT_SECRET,
  JWT_REFRESH_EXPIRES_IN = "30d",
} = process.env;

// OTP config
export const {
  OTP_LENGTH = "6",
  OTP_EXPIRY_MINUTES = "5",
  OTP_MAX_ATTEMPTS = "5",
  OTP_RESEND_SECONDS = "30",
  OTP_BYPASS_ENABLED = "false",
  OTP_BYPASS_NUMBER = "",
  OTP_BYPASS_CODE = "",
} = process.env;

// SMS provider — falls back to mock/log mode when no API key is configured.
export const { SMS_PROVIDER_API_KEY, SMS_PROVIDER_SENDER_ID = "WEOURM" } =
  process.env;

// Mail provider — falls back to mock/log mode when no API key is configured.
export const {
  RESEND_API_KEY,
  REMINDER_FROM_EMAIL = "WeOur Matrimony <noreply@weourmatrimony.com>",
} = process.env;

export const isProduction = process.env.NODE_ENV === "production";

// OAuth providers
export const { GOOGLE_CLIENT_ID = "", APPLE_CLIENT_ID = "" } = process.env;

export const env: any = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI || MongoDB_URL || "",
  API_BASE_PATH: process.env.API_BASE_PATH || "/api",
  MEMBERSHIP_PRICE_INR: Number(process.env.MEMBERSHIP_PRICE_INR || "0"),
  MEMBERSHIP_DURATION_DAYS: Number(
    process.env.MEMBERSHIP_DURATION_DAYS || "30",
  ),
  GOOGLE_CLIENT_ID,
  APPLE_CLIENT_ID,
};
