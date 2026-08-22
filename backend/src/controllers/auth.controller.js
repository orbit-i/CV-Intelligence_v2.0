import { supabase, supabaseAdmin } from "../config/supabase.js";
import { sendOtpEmail, sendPasswordResetEmail,sendLoginEmail } from "../services/email.service.js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

// OTPs are valid for 10 minutes. Emails are sent in the background
// (see the *Async helpers below), so this needs real headroom -
// it must not be shorter than realistic email delivery time.
const OTP_TTL_MS = 45 * 1000;

// --------------------------------------------------------
// Fire-and-forget email helpers.
//
// The HTTP response should not wait on Gmail. We've already
// committed the OTP / reset link to the database by the time
// these are called, so the user can always hit "resend" if an
// email genuinely fails to arrive. We just log failures instead
// of making the request hang until Gmail finishes.
// --------------------------------------------------------

const sendOtpEmailAsync = (email, otp, name) => {
  sendOtpEmail(email, otp, name).catch((error) => {
    console.error(
      `❌ Background OTP email failed for ${email}:`,
      error.message
    );
  });
};

const sendPasswordResetEmailAsync = (email, resetLink) => {
  sendPasswordResetEmail(email, resetLink).catch((error) => {
    console.error(
      `❌ Background password reset email failed for ${email}:`,
      error.message
    );
  });
};
export const register = async (req, res) => {
  try {
    const {
      name,
      organizationName,
      email,
      password,
      confirmPassword
    } = req.body;

    // --------------------------------
    // 1. Validate required fields
    // --------------------------------

    if (
      !name ||
      !organizationName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const cleanName = name.trim();
    const cleanOrganizationName =
      organizationName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    // --------------------------------
    // 2. Validate password
    // --------------------------------

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    // --------------------------------
    // 3. Validate email
    // --------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address"
      });
    }

    // --------------------------------
    // 4. Create Supabase Auth user
    // --------------------------------

    const {
      data: authData,
      error: authError
    } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: cleanName,
        organization_name: cleanOrganizationName
      }
    });

    if (authError) {
      console.error("Supabase Auth error:", authError);

      return res.status(400).json({
        success: false,
        message: authError.message
      });
    }

    const user = authData.user;

    // --------------------------------
    // 5. Create profile
    // --------------------------------

    const {
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        name: cleanName,
        organization_name: cleanOrganizationName,
        email: cleanEmail,
        role: "user",
        email_verified: false
      });

    if (profileError) {
      console.error("Profile error:", profileError);

      await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

      return res.status(500).json({
        success: false,
        message: "Could not create user profile"
      });
    }

    // --------------------------------
    // 6. Generate OTP
    // --------------------------------

    const otp = generateOtp();

    const otpHash = hashOtp(otp);

    const expiresAt = new Date(
      Date.now() + OTP_TTL_MS
    );

    // --------------------------------
    // 7. Store OTP hash
    // --------------------------------

    const { error: otpError } =
      await supabaseAdmin
        .from("email_otps")
        .insert({
          user_id: user.id,
          email: cleanEmail,
          otp_hash: otpHash,
          expires_at: expiresAt.toISOString()
        });

    if (otpError) {
      console.error("OTP database error:", otpError);

      await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

      return res.status(500).json({
        success: false,
        message: "Could not create verification code"
      });
    }

    // --------------------------------
    // 8. Send OTP through Gmail (background)
    // --------------------------------
    // Don't make the client wait on Gmail - the OTP row already
    // exists, so respond immediately and let the email go out
    // asynchronously. If it fails, it's logged server-side and
    // the user can request a fresh OTP via /resend-otp.

    sendOtpEmailAsync(cleanEmail, otp, cleanName);

    // --------------------------------
    // 9. Response
    // --------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Account created. A 6-digit verification code has been sent to your email.",
      user: {
        id: user.id,
        email: user.email,
        name: cleanName,
        organizationName: cleanOrganizationName
      },
      requiresVerification: true
    });

  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits"
      });
    }

    // --------------------------------
    // Find latest OTP
    // --------------------------------

    const {
      data: otpRecord,
      error: findError
    } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", cleanEmail)
      .eq("verified", false)
      .order("created_at", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error(findError);

      return res.status(500).json({
        success: false,
        message: "Could not verify OTP"
      });
    }

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // --------------------------------
    // Check expiration
    // --------------------------------

    if (
      new Date(otpRecord.expires_at) <
      new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    // --------------------------------
    // Compare OTP hash
    // --------------------------------

    const submittedHash =
      hashOtp(cleanOtp);

    if (
      submittedHash !== otpRecord.otp_hash
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // --------------------------------
    // Mark OTP verified
    // --------------------------------

    await supabaseAdmin
      .from("email_otps")
      .update({
        verified: true
      })
      .eq("id", otpRecord.id);

    // --------------------------------
    // Confirm Supabase user email
    // --------------------------------

    const {
      data: userData,
      error: userError
    } = await supabaseAdmin.auth.admin.updateUserById(
      otpRecord.user_id,
      {
        email_confirm: true
      }
    );

    if (userError) {
      console.error(userError);

      return res.status(500).json({
        success: false,
        message: "Could not verify user email"
      });
    }

    // --------------------------------
    // Update profile
    // --------------------------------

    const {
      data: profileData,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", otpRecord.user_id)
      .select("id, name, role")
      .maybeSingle();

    if (profileError) {
      console.error(profileError);

      return res.status(500).json({
        success: false,
        message: "Could not update profile"
      });
    }

    // --------------------------------
    // Issue JWT — user is now verified
    // --------------------------------

    const jwtPayload = {
      sub: userData.user.id,
      email: userData.user.email,
      name: profileData?.name ?? null,
      role: profileData?.role ?? "user"
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: userData.user.id,
        email: userData.user.email,
        name: profileData?.name ?? null,
        role: profileData?.role ?? "user"
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
      }
    });

  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // --------------------------------
    // 1. Validate email
    // --------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // --------------------------------
    // 2. Find user profile
    // --------------------------------

    const {
      data: profile,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, email_verified")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);

      return res.status(500).json({
        success: false,
        message: "Could not find account"
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email"
      });
    }

    // --------------------------------
    // 3. Check if already verified
    // --------------------------------

    if (profile.email_verified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified"
      });
    }

    // --------------------------------
    // 4. Invalidate previous OTPs
    // --------------------------------

    const { error: invalidateError } =
      await supabaseAdmin
        .from("email_otps")
        .update({
          verified: true
        })
        .eq("email", cleanEmail)
        .eq("verified", false);

    if (invalidateError) {
      console.error(
        "Invalidate OTP error:",
        invalidateError
      );

      return res.status(500).json({
        success: false,
        message: "Could not generate a new OTP"
      });
    }

    // --------------------------------
    // 5. Generate new 6-digit OTP
    // --------------------------------

    const otp = generateOtp();

    const otpHash = hashOtp(otp);

    // OTP expires in 10 minutes
    const expiresAt = new Date(
      Date.now() + OTP_TTL_MS
    );

    // --------------------------------
    // 6. Save new OTP
    // --------------------------------

    const {
      error: otpError
    } = await supabaseAdmin
      .from("email_otps")
      .insert({
        user_id: profile.id,
        email: cleanEmail,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        verified: false
      });

    if (otpError) {
      console.error("OTP insert error:", otpError);

      return res.status(500).json({
        success: false,
        message: "Could not create new OTP"
      });
    }

    // --------------------------------
    // 7. Send OTP using Gmail SMTP (background)
    // --------------------------------
    // Respond immediately; the email goes out asynchronously so
    // this endpoint no longer blocks on Gmail's round trip.

    sendOtpEmailAsync(cleanEmail, otp, profile.name);

    // --------------------------------
    // 8. Response
    // --------------------------------

    return res.status(200).json({
      success: true,
      message:
        "A new 6-digit OTP has been sent to your email",
      expiresIn: "45 seconds"
    });

  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // -----------------------------
    // Validate input
    // -----------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // -----------------------------
    // Login with Supabase Auth
    // -----------------------------

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      console.error("Login error:", error);

      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!data.user) {
      return res.status(401).json({
        success: false,
        message: "Unable to authenticate user"
      });
    }

    // -----------------------------
    // Check email verification
    // -----------------------------

    const {
      data: profile,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, organization_name, email, role, email_verified"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);

      return res.status(500).json({
        success: false,
        message: "Could not load user profile"
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    if (!profile.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true
      });
    }

    // -----------------------------
    // Successful login — issue JWT
    // -----------------------------

    const jwtPayload = {
      sub: data.user.id,
      email: data.user.email,
      name: profile.name,
      role: profile.role
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);
    try {
        await sendLoginEmail(
          data.user.email,
          profile.name
        );
      } catch (emailError) {
        console.error(
          "Background login email failed:",
          emailError.message
        );  
      }
    return res.status(200).json({
      success: true,
      message: "Login successful",

      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        organizationName: profile.organization_name,
        role: profile.role,
        emailVerified: profile.email_verified
      },

      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
      }
    });

  } catch (error) {
    console.error("Login server error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // --------------------------------
    // 1. Validate email
    // --------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address"
      });
    }

    // --------------------------------
    // 2. Check account exists
    // --------------------------------

    const {
      data: profile,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, email_verified")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);

      return res.status(500).json({
        success: false,
        message: "Could not process request"
      });
    }

    // Return generic 200 even if account not found to
    // prevent email enumeration attacks
    if (!profile) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent"
      });
    }

    // --------------------------------
    // 3. Check email is verified
    // --------------------------------

    if (!profile.email_verified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email address before resetting your password"
      });
    }

    // --------------------------------
    // 4. Generate Supabase reset link
    // --------------------------------

    const {
      data: linkData,
      error: linkError
    } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: {
        redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL
      }
    });

    if (linkError) {
      console.error("Reset link generation error:", linkError);

      return res.status(500).json({
        success: false,
        message: "Could not generate password reset link"
      });
    }

    const resetLink = linkData.properties?.action_link;

    if (!resetLink) {
      return res.status(500).json({
        success: false,
        message: "Could not generate password reset link"
      });
    }

    // --------------------------------
    // 5. Send reset email via Gmail (background)
    // --------------------------------
    // The reset link is already generated; don't make the caller
    // wait on Gmail's SMTP round trip to get a response.

    sendPasswordResetEmailAsync(cleanEmail, resetLink);

    // --------------------------------
    // 6. Response
    // --------------------------------

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent"
    });

  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { accessToken, newPassword, confirmPassword } = req.body;

    // --------------------------------------
    // 1. Validate request
    // --------------------------------------

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Recovery access token is required"
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    // --------------------------------------
    // 2. Validate recovery access token
    // --------------------------------------

    const {
      data: userData,
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      console.error("Recovery token validation error:", userError);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired recovery token"
      });
    }

    const user = userData.user;

    // --------------------------------------
    // 3. Update password
    // --------------------------------------

    const {
      data: updatedUser,
      error: updateError
    } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword
      }
    );

    if (updateError) {
      console.error("Password update error:", updateError);

      return res.status(400).json({
        success: false,
        message: "Could not update password"
      });
    }

    // --------------------------------------
    // 4. Success
    // --------------------------------------

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user is set by requireAuth middleware (decoded JWT payload)
    const userId = req.user.sub;

    const {
      data: profile,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .select("id, name, organization_name, email, role, email_verified")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("getMe profile error:", profileError);

      return res.status(500).json({
        success: false,
        message: "Could not load user profile"
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        organizationName: profile.organization_name,
        email: profile.email,
        role: profile.role,
        emailVerified: profile.email_verified
      }
    });

  } catch (error) {
    console.error("getMe error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
