import rateLimit from "express-rate-limit";

/**
 * Generic rate limiter factory.
 * Creates a limiter with a custom window, max requests, and message.
 */
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,     // Disable X-RateLimit-* headers
    message: {
      success: false,
      message
    }
  });

/**
 * Registration — 10 attempts per 15 minutes per IP.
 * Prevents account-creation spam.
 */
export const registerLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many registration attempts. Please try again in 15 minutes."
);

/**
 * Login — 10 attempts per 15 minutes per IP.
 * Slows down brute-force credential stuffing.
 */
export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again in 15 minutes."
);

/**
 * OTP verification — 10 attempts per 10 minutes per IP.
 */
export const verifyOtpLimiter = createLimiter(
  10 * 60 * 1000,
  10,
  "Too many OTP attempts. Please try again in 10 minutes."
);

/**
 * Resend OTP — 5 requests per 10 minutes per IP.
 * Prevents OTP email flooding.
 */
export const resendOtpLimiter = createLimiter(
  10 * 60 * 1000,
  5,
  "Too many resend requests. Please try again in 10 minutes."
);

/**
 * Forgot password — 5 requests per 15 minutes per IP.
 * Prevents reset-link spam.
 */
export const forgotPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again in 15 minutes."
);
