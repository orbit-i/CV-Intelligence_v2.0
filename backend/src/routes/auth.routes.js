import express from "express";
import passport from "passport";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/auth.controller.js";

import { sendLoginEmail } from "../services/email.service.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import {
  registerLimiter,
  loginLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter
} from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// --------------------------------------------------------
// Fire-and-forget helper for OAuth login notifications.
//
// OAuth callbacks redirect the browser immediately - they
// must not wait on Gmail's SMTP round trip before sending
// the user back to the frontend. Failures are logged only.
// --------------------------------------------------------

const sendOAuthLoginEmailAsync = (email, name, provider) => {
  sendLoginEmail(email, name).catch((error) => {
    console.error(
      `❌ Background ${provider} login email failed for ${email}:`,
      error.message
    );
  });
};

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Login with Google
 *     description: Redirects the user to Google for authentication.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirects the user to Google OAuth login page
 *       500:
 *         description: Google OAuth configuration error
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google after successful authentication.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         required: false
 *         schema:
 *           type: string
 *         description: Authorization code returned by Google
 *     responses:
 *       302:
 *         description: Redirects the authenticated user to the frontend
 *       401:
 *         description: Google authentication failed
 *       500:
 *         description: Internal server error
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const user = req.user;

    // Send login notification in the background - do not make
    // the redirect wait on Gmail's SMTP round trip.
    sendOAuthLoginEmailAsync(user.email, user.name, "Google");

    const params = new URLSearchParams({
      userId: user.id,
      email: user.email,
      name: user.name || "",
      provider: "google",
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?${params.toString()}`
    );
  }
);

/**
 * @swagger
 * /api/auth/microsoft:
 *   get:
 *     summary: Login with Microsoft
 *     description: Redirects the user to Microsoft for authentication.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirects the user to Microsoft OAuth login page
 *       500:
 *         description: Microsoft OAuth configuration error
 */
router.get(
  "/microsoft",
  passport.authenticate("microsoft")
);

/**
 * @swagger
 * /api/auth/microsoft/callback:
 *   get:
 *     summary: Microsoft OAuth callback
 *     description: Handles the callback from Microsoft after successful authentication.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         required: false
 *         schema:
 *           type: string
 *         description: Authorization code returned by Microsoft
 *     responses:
 *       302:
 *         description: Redirects the authenticated user to the frontend
 *       401:
 *         description: Microsoft authentication failed
 *       500:
 *         description: Internal server error
 */
router.get(
  "/microsoft/callback",
  passport.authenticate("microsoft", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=microsoft_auth_failed`,
  }),
  (req, res) => {
    const user = req.user;

    // Send login notification in the background - do not make
    // the redirect wait on Gmail's SMTP round trip.
    sendOAuthLoginEmailAsync(user.email, user.name, "Microsoft");

    const params = new URLSearchParams({
      userId: user.id,
      email: user.email,
      name: user.name || "",
      provider: "microsoft",
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?${params.toString()}`
    );
  }
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and sends a 6-digit OTP to the user's email through Gmail SMTP.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - organizationName
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: Abu Bakar
 *               organizationName:
 *                 type: string
 *                 description: User's organization name
 *                 example: ABC Organization
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: abu@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: Password@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Password confirmation
 *                 example: Password@123
 *
 *     responses:
 *       201:
 *         description: Account created successfully and OTP sent
 *       400:
 *         description: Invalid input or passwords do not match
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/register", registerLimiter, register);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify email OTP
 *     description: Verifies the 6-digit OTP sent to the user's email.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: abu@example.com
 *               otp:
 *                 type: string
 *                 description: Six-digit verification code
 *                 example: "483921"
 *
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Internal server error
 */
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend email verification OTP
 *     description: Generates a new 6-digit OTP and sends it through Gmail SMTP.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: abu@example.com
 *
 *     responses:
 *       200:
 *         description: New OTP sent successfully
 *       400:
 *         description: Email already verified or invalid request
 *       404:
 *         description: Account not found
 *       500:
 *         description: Internal server error
 */
router.post("/resend-otp", resendOtpLimiter, resendOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates a user using Supabase Auth.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: abu@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password@123
 *
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Email is not verified
 *       500:
 *         description: Internal server error
 */
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset link
 *     description: Generates a Supabase password recovery link and sends it through Gmail SMTP.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: abu@gmail.com
 *
 *     responses:
 *       200:
 *         description: Password reset link sent successfully
 *       400:
 *         description: Invalid email
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Validates a Supabase recovery access token and securely updates the user's password.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Supabase recovery access token
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *                 example: NewPassword@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirm new password
 *                 example: NewPassword@123
 *
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid password or password update failed
 *       401:
 *         description: Invalid or expired recovery token
 *       500:
 *         description: Internal server error
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the profile of the user identified by the Bearer JWT.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned successfully
 *       401:
 *         description: Missing, invalid, or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/me", requireAuth, getMe);

export default router;
