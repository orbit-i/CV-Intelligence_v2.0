import nodemailer from "nodemailer";

/* =========================================
   TRANSPORTER (pooled + persistent)

   IMPORTANT: this file assumes a long-running
   Node process (Express/Fastify server, worker,
   etc). The transporter is created once at
   module load and reused for every send — that's
   what makes pooling actually work.

   If this ever runs in a serverless environment
   (Vercel/Lambda/Cloud Functions), pooling gives
   little benefit because each invocation can get
   a fresh container, and you should switch to an
   HTTP-based provider (Resend/SES/Postmark)
   instead of SMTP.
========================================= */

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },

  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  rateDelta: 1000,
  rateLimit: 5,

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 20000
});

const BRAND = "CV-Intelligence";
const BRAND_COLOR = "#4F46E5";
const FROM = `"${BRAND}" <${process.env.GMAIL_USER}>`;

// Verify once at startup, not per-send.
transporter
  .verify()
  .then(() => console.log("✅ Gmail SMTP connected"))
  .catch((error) =>
    console.error("❌ Gmail SMTP connection failed:", error.message)
  );

/* =========================================
   SEND QUEUE (in-memory, lightweight)

   Purpose: callers never `await` a send inline
   in a request handler. Instead they call
   `queueEmail(fn, args)`, which returns
   immediately. The actual send happens in the
   background with retry + backoff, so a slow or
   flaky Gmail response never blocks the HTTP
   response to your user.

   This is intentionally simple (no Redis/BullMQ
   dependency). For high volume or delivery
   guarantees across restarts, swap this for a
   real queue — the call sites below don't change.
========================================= */

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWithRetry(sendFn, args) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendFn(...args);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_RETRIES;

      console.error(
        `❌ Email send failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
        error.message
      );

      if (!isLastAttempt) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }

  console.error("❌ Email permanently failed after retries:", lastError.message);
  // Hook point: push to a dead-letter table, alert on-call, etc.
  throw lastError;
}

/**
 * Fire-and-forget helper. Returns immediately; the actual
 * send + retries happen in the background. Use this from
 * request handlers so email latency never blocks the response.
 *
 * @param {(...args: any[]) => Promise<any>} sendFn - one of the send* functions below
 * @param {any[]} args - arguments to pass to sendFn
 * @param {(error: Error) => void} [onError] - optional failure callback (logging/alerting)
 */
export function queueEmail(sendFn, args, onError) {
  sendWithRetry(sendFn, args).catch((error) => {
    if (onError) onError(error);
  });
}

/* =========================================
   RESPONSIVE / CROSS-CLIENT EMAIL WRAPPER
========================================= */

const emailWrapper = (contentHtml) => `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${BRAND}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; }

    :root { color-scheme: light; supported-color-schemes: light; }
    @media (prefers-color-scheme: dark) {
      .email-bg   { background:#f4f4f7 !important; }
      .email-card { background:#ffffff !important; }
      body, p, span, td, div { color: inherit; }
    }

    .email-container {
      width: 600px;
      max-width: 600px;
    }

    .email-content {
      padding: 32px !important;
    }

    .otp-code {
      font-size: 34px !important;
      letter-spacing: 10px !important;
    }

    .btn-fallback { display: none !important; mso-hide: all; }
    .btn {
      display: inline-block !important;
      width: auto !important;
    }

    @media only screen and (max-width: 768px) {
      .email-container {
        width: 92% !important;
        max-width: 92% !important;
      }
    }

    @media only screen and (max-width: 480px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }

      .email-content {
        padding: 24px 20px !important;
      }

      .email-header {
        padding: 20px 20px !important;
      }

      .email-footer {
        padding: 16px 20px !important;
      }

      .otp-code {
        font-size: 26px !important;
        letter-spacing: 5px !important;
      }

      .btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
        text-align: center !important;
      }

      h1, h2 {
        font-size: 20px !important;
      }
    }

    @media only screen and (max-width: 360px) {
      .otp-code {
        font-size: 22px !important;
        letter-spacing: 3px !important;
      }

      .email-content {
        padding: 18px 14px !important;
      }
    }
  </style>
</head>

<body class="email-bg" style="
  margin:0;
  padding:0;
  background:#f4f4f7;
  font-family:Arial, Helvetica, sans-serif;
">

<table
  role="presentation"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  class="email-bg"
  style="background:#f4f4f7;padding:40px 12px;"
>
  <tr>
    <td align="center">

      <!--[if mso]>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center">
      <tr>
      <td>
      <![endif]-->

      <table
        role="presentation"
        class="email-container email-card"
        width="600"
        cellpadding="0"
        cellspacing="0"
        style="
          background:#ffffff;
          border-radius:12px;
          overflow:hidden;
          margin:0 auto;
        "
      >

        <tr>
          <td class="email-header" style="
            background:${BRAND_COLOR};
            padding:24px 32px;
          ">
            <span style="
              font-size:20px;
              font-weight:bold;
              color:#ffffff;
            ">
              ${BRAND}
            </span>
          </td>
        </tr>

        <tr>
          <td class="email-content" style="padding:32px;">
            ${contentHtml}
          </td>
        </tr>

        <tr>
          <td class="email-footer" style="
            padding:20px 32px;
            background:#fafafa;
            border-top:1px solid #eee;
          ">
            <p style="
              margin:0;
              font-size:12px;
              color:#999;
              text-align:center;
            ">
              © ${new Date().getFullYear()} ${BRAND}.
              This is an automated message.
            </p>
          </td>
        </tr>

      </table>

      <!--[if mso]>
      </td>
      </tr>
      </table>
      <![endif]-->

    </td>
  </tr>
</table>

</body>
</html>
`;

const bulletproofButton = (href, label) => `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="16%" fillcolor="${BRAND_COLOR}" stroke="f">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a
  href="${href}"
  class="btn"
  style="
    display:inline-block;
    padding:14px 32px;
    background:${BRAND_COLOR};
    color:#ffffff;
    text-decoration:none;
    font-weight:bold;
    border-radius:8px;
    font-size:15px;
    mso-hide:all;
  "
>
  ${label}
</a>
<!--<![endif]-->
`;

/* =========================================
   SEND OTP EMAIL
========================================= */

export const sendOtpEmail = async (email, otp, name) => {
  const content = `
      <h2 style="margin:0 0 16px; color:#111; font-size:22px;">
        Verify your email
      </h2>

      <p style="margin:0 0 8px; color:#444; font-size:15px;">
        Hello ${name},
      </p>

      <p style="margin:0 0 24px; color:#444; font-size:15px; line-height:1.5;">
        Thanks for creating an account with ${BRAND}.
        Use the verification code below.
      </p>

      <div style="
        background:#f5f5fb;
        border:1px dashed ${BRAND_COLOR};
        border-radius:10px;
        padding:20px;
        text-align:center;
        margin-bottom:24px;
      ">
        <div class="otp-code" style="
          font-family:'Courier New',Courier,monospace;
          font-size:34px;
          font-weight:bold;
          letter-spacing:10px;
          color:${BRAND_COLOR};
        ">
          ${otp}
        </div>

        <p style="margin:10px 0 0; font-size:12px; color:#888;">
          This code expires in 45 seconds.
        </p>
      </div>

      <p style="margin:0; font-size:13px; color:#999;">
        If you didn't create this account,
        you can safely ignore this email.
      </p>
    `;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your email address",
    html: emailWrapper(content)
  });

  console.log("✅ OTP email sent:", info.messageId);
  return info;
};

/* =========================================
   SEND PASSWORD RESET EMAIL
========================================= */

export const sendPasswordResetEmail = async (email, resetLink) => {
  const content = `
      <h2 style="margin:0 0 16px; color:#111; font-size:22px;">
        Reset your password
      </h2>

      <p style="margin:0 0 24px; color:#444; font-size:15px; line-height:1.5;">
        We received a request to reset your
        ${BRAND} account password.
      </p>

      <div style="text-align:center; margin-bottom:24px;">
        ${bulletproofButton(resetLink, "Reset Password")}
      </div>

      <p style="margin:0; font-size:13px; color:#999;">
        If you didn't request this,
        you can safely ignore this email.
      </p>
    `;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Reset Your Password",
    html: emailWrapper(content)
  });

  console.log("✅ Password reset email sent:", info.messageId);
  return info;
};

/* =========================================
   SEND LOGIN NOTIFICATION EMAIL
========================================= */

export const sendLoginEmail = async (email, name) => {
  const loginDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const loginTime = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const content = `
      <div style="text-align:center; margin-bottom:28px;">
        <div style="
          width:64px;
          height:64px;
          margin:0 auto 16px;
          background:${BRAND_COLOR};
          border-radius:50%;
          text-align:center;
          line-height:64px;
          color:#ffffff;
          font-size:28px;
          font-weight:bold;
        ">
          ✓
        </div>

        <h1 style="margin:0; color:#111827; font-size:24px; font-weight:700;">
          Login Successful
        </h1>

        <p style="margin:8px 0 0; color:#6b7280; font-size:14px;">
          Your account was successfully accessed
        </p>
      </div>

      <p style="margin:0 0 10px; color:#333; font-size:15px;">
        Dear ${name || "Customer"},
      </p>

      <p style="margin:0 0 24px; color:#555; font-size:14px; line-height:1.7;">
        You have successfully logged on to
        <strong>${BRAND}</strong>.
      </p>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          background:#f8f9fc;
          border:1px solid #e5e7eb;
          border-radius:10px;
          margin-bottom:25px;
        "
      >
        <tr>
          <td style="padding:18px 20px;">
            <p style="
              margin:0 0 14px;
              color:#6b7280;
              font-size:12px;
              text-transform:uppercase;
              letter-spacing:.5px;
            ">
              Login Details
            </p>

            <p style="margin:0 0 10px; color:#333; font-size:14px;">
              <strong>Date:</strong> ${loginDate}
            </p>

            <p style="margin:0 0 10px; color:#333; font-size:14px;">
              <strong>Time:</strong> ${loginTime}
            </p>

            <p style="margin:0; color:#333; font-size:14px; word-break:break-all;">
              <strong>Account:</strong> ${email}
            </p>
          </td>
        </tr>
      </table>
    `;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    replyTo: process.env.GMAIL_USER,
    subject: `${BRAND} - Successful Login`,
    html: emailWrapper(content),
    text: `
Dear ${name || "Customer"},

You have successfully logged on to ${BRAND}.

Date: ${loginDate}
Time: ${loginTime}
Account: ${email}
    `
  });

  console.log("✅ Login notification email sent:", info.messageId);
  return info;
};
