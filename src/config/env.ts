import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_PATH: z.string().default('/api'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  CORS_ORIGIN: z.string().default('http://localhost:4200,http://localhost:8100'),

  AZURE_STORAGE_CONNECTION_STRING: z.string().optional().default(''),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional().default(''),
  AZURE_CONTAINER_PROFILE_IMAGES: z.string().default('profile-images'),
  AZURE_CONTAINER_GALLERY: z.string().default('gallery'),
  AZURE_CONTAINER_HOROSCOPE: z.string().default('horoscope'),
  AZURE_CONTAINER_DOCUMENTS: z.string().default('documents'),
  AZURE_CONTAINER_CHAT_IMAGES: z.string().default('chat-images'),
  AZURE_CONTAINER_TEMP: z.string().default('temp'),

  SMS_PROVIDER_API_KEY: z.string().optional().default(''),
  SMS_PROVIDER_SENDER_ID: z.string().default('WEOURM'),

  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  OTP_RESEND_SECONDS: z.coerce.number().int().min(10).default(30),

  // Dev/test-only bypass — lets QA and automated tests log in without a real SMS. Forced off in production.
  OTP_BYPASS_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  OTP_BYPASS_NUMBER: z.string().optional().default(''),
  OTP_BYPASS_CODE: z.string().optional().default(''),

  PAYMENT_GATEWAY_KEY_ID: z.string().optional().default(''),
  PAYMENT_GATEWAY_KEY_SECRET: z.string().optional().default(''),
  MEMBERSHIP_PRICE_INR: z.coerce.number().default(20),
  MEMBERSHIP_DURATION_DAYS: z.coerce.number().default(90),

  RESEND_API_KEY: z.string().optional().default(''),
  REMINDER_FROM_EMAIL: z.string().default('WeOur Matrimony <noreply@weourmatrimony.com>'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  APPLE_CLIENT_ID: z.string().optional().default(''),

  AZURE_KEY_VAULT_URL: z.string().optional().default(''),

  // Optional — running `npm run seed:admin` with these set creates/updates one super-admin account.
  ADMIN_SEED_EMAIL: z.string().optional().default(''),
  ADMIN_SEED_PASSWORD: z.string().optional().default(''),
  ADMIN_SEED_MOBILE: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

if (env.OTP_BYPASS_ENABLED && isProduction) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  OTP_BYPASS_ENABLED is set but is ignored in production for safety.');
}

/** True only outside production, with the flag on and a configured bypass number — never trust the raw env flag directly. */
export const isOtpBypassActive = env.OTP_BYPASS_ENABLED && !isProduction && env.OTP_BYPASS_NUMBER !== '';
