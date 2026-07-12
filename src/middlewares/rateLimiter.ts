import rateLimit from 'express-rate-limit';

/** General API rate limit. */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limit for auth/OTP endpoints to slow down brute-force/OTP-spam attempts. */
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    errors: [],
  },
});
