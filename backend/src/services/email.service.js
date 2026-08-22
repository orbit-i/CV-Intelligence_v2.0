import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },

  // Reuse SMTP connections instead of doing a fresh TLS handshake
  // + login on every single send. This is the single biggest lever
  // for cutting per-email latency once the pool is warm.
  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 3000
});

const BRAND = "Orbit";
const BRAND_COLOR = "#4F46E5";
const FROM = `"${BRAND}" <${process.env.GMAIL_USER}>`;

const emailWrapper = (contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${BRAND}</title>
</head>

<body style="
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
  style="background:#f4f4f7;padding:40px 0;"
>
  <tr>
    <td align="center">

      <table
        role="presentation"
        width="480"
        cellpadding="0"
        cellspacing="0"
        style="
          background:#ffffff;
          border-radius:12px;
          overflow:hidden;
        "
      >

        <!-- Header -->

        <tr>
          <td style="
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

        <!-- Content -->

        <tr>
          <td style="padding:32px;">
            ${contentHtml}
          </td>
        </tr>

        <!-- Footer -->

        <tr>
          <td style="
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

    </td>
  </tr>
</table>

</body>
</html>
`;


/* =========================================
   VERIFY SMTP
========================================= */

transporter.verify()
  .then(() => {
    console.log("✅ Gmail SMTP connected");
  })
  .catch((error) => {
    console.error(
      "❌ Gmail SMTP connection failed:",
      error.message
    );
  });


/* =========================================
   SEND OTP EMAIL
========================================= */

export const sendOtpEmail = async (
  email,
  otp,
  name
) => {

  try {

    console.log("📧 Sending OTP email...");
    console.log("To:", email);

    const content = `

      <h2 style="
        margin:0 0 16px;
        color:#111;
        font-size:22px;
      ">
        Verify your email
      </h2>

      <p style="
        margin:0 0 8px;
        color:#444;
        font-size:15px;
      ">
        Hello ${name},
      </p>

      <p style="
        margin:0 0 24px;
        color:#444;
        font-size:15px;
        line-height:1.5;
      ">
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

        <div style="
          font-family:'Courier New',Courier,monospace;
          font-size:34px;
          font-weight:bold;
          letter-spacing:10px;
          color:${BRAND_COLOR};
        ">
          ${otp}
        </div>

        <p style="
          margin:10px 0 0;
          font-size:12px;
          color:#888;
        ">
          This code expires in 45 seconds.
        </p>

      </div>

      <p style="
        margin:0;
        font-size:13px;
        color:#999;
      ">
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

    console.log(
      "✅ OTP email sent:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "❌ OTP email error:",
      error.message
    );

    throw error;
  }
};


/* =========================================
   SEND PASSWORD RESET EMAIL
========================================= */

export const sendPasswordResetEmail = async (
  email,
  resetLink
) => {

  try {

    console.log(
      "📧 Sending password reset email..."
    );

    const content = `

      <h2 style="
        margin:0 0 16px;
        color:#111;
        font-size:22px;
      ">
        Reset your password
      </h2>

      <p style="
        margin:0 0 24px;
        color:#444;
        font-size:15px;
        line-height:1.5;
      ">
        We received a request to reset your
        ${BRAND} account password.
      </p>

      <div style="
        text-align:center;
        margin-bottom:24px;
      ">

        <a
          href="${resetLink}"
          style="
            display:inline-block;
            padding:14px 32px;
            background:${BRAND_COLOR};
            color:#ffffff;
            text-decoration:none;
            font-weight:bold;
            border-radius:8px;
            font-size:15px;
          "
        >
          Reset Password
        </a>

      </div>

      <p style="
        margin:0;
        font-size:13px;
        color:#999;
      ">
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

    console.log(
      "✅ Password reset email sent:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "❌ Password reset email error:",
      error.message
    );

    throw error;
  }
};


/* =========================================
   SEND LOGIN NOTIFICATION EMAIL
========================================= */

export const sendLoginEmail = async (email, name) => {
  try {
    console.log("📧 Sending login notification email...");
    console.log("To:", email);

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

      <!-- Welcome -->

      <div style="
        text-align:center;
        margin-bottom:28px;
      ">

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

        <h1 style="
          margin:0;
          color:#111827;
          font-size:24px;
          font-weight:700;
        ">
          Login Successful
        </h1>

        <p style="
          margin:8px 0 0;
          color:#6b7280;
          font-size:14px;
        ">
          Your account was successfully accessed
        </p>

      </div>


      <!-- Greeting -->

      <p style="
        margin:0 0 10px;
        color:#333;
        font-size:15px;
      ">

        Dear ${name || "Customer"},

      </p>


      <p style="
        margin:0 0 24px;
        color:#555;
        font-size:14px;
        line-height:1.7;
      ">

        You have successfully logged on to
        <strong>${BRAND}</strong>.

      </p>


      <!-- Login Information Card -->

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

          <td style="
            padding:18px 20px;
          ">

            <p style="
              margin:0 0 14px;
              color:#6b7280;
              font-size:12px;
              text-transform:uppercase;
              letter-spacing:.5px;
            ">
              Login Details
            </p>


            <p style="
              margin:0 0 10px;
              color:#333;
              font-size:14px;
            ">
              <strong>Date:</strong>
              ${loginDate}
            </p>


            <p style="
              margin:0 0 10px;
              color:#333;
              font-size:14px;
            ">
              <strong>Time:</strong>
              ${loginTime}
            </p>


            <p style="
              margin:0;
              color:#333;
              font-size:14px;
            ">
              <strong>Account:</strong>
              ${email}
            </p>

          </td>

        </tr>

      </table>


      <!-- Security Message -->

      <div style="
        background:#eef2ff;
        border-left:4px solid ${BRAND_COLOR};
        padding:16px 18px;
        margin-bottom:25px;
      ">

        <p style="
          margin:0 0 7px;
          color:#111827;
          font-size:14px;
          font-weight:bold;
        ">
          Security Notice
        </p>

        <p style="
          margin:0;
          color:#4b5563;
          font-size:13px;
          line-height:1.6;
        ">
          If this login was performed by you,
          no further action is required.
          If you did not perform this login,
          please secure your account immediately.
        </p>

      </div>


      <!-- Important Notice -->

      <div style="
        border-top:1px solid #eeeeee;
        padding-top:20px;
      ">

        <p style="
          margin:0 0 8px;
          color:#333;
          font-size:12px;
          font-weight:bold;
        ">
          Important Notice:
        </p>

        <p style="
          margin:0;
          color:#777;
          font-size:11px;
          line-height:1.6;
        ">
          ${BRAND} will never ask for your password,
          OTP, or other security information through
          email, SMS, or phone.
        </p>

      </div>


      <!-- Support -->

      <p style="
        margin:22px 0 0;
        color:#555;
        font-size:13px;
        line-height:1.6;
      ">

        For more information or assistance,
        please contact ${BRAND} support.

      </p>


      <!-- Signature -->

      <p style="
        margin:20px 0 0;
        color:#222;
        font-size:14px;
        font-weight:bold;
      ">

        ${BRAND}

      </p>


      <!-- Disclaimer -->

      <div style="
        margin-top:25px;
        padding-top:18px;
        border-top:1px solid #eeeeee;
      ">

        <p style="
          margin:0;
          color:#999;
          font-size:10px;
          line-height:1.6;
        ">

          <strong>Disclaimer:</strong>
          This is an automated security notification
          intended solely for the account holder.
          If you received this email in error, please
          disregard it. Please do not share your password,
          OTP, or other confidential account information.

        </p>

      </div>

    `;


    // =========================================
    // SEND EMAIL
    // =========================================

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

If this login was performed by you, no further action is required.

If you did not perform this login, please secure your account immediately.

Important Notice:
${BRAND} will never ask for your password, OTP, or other security information through email, SMS, or phone.

${BRAND}

This is an automated security notification.
      `
    });


    console.log(
      "✅ Login notification email sent:",
      info.messageId
    );

    console.log(
      "📨 Accepted:",
      info.accepted
    );

    console.log(
      "📨 Rejected:",
      info.rejected
    );

    console.log(
      "📨 Response:",
      info.response
    );

    return info;

  } catch (error) {

    console.error(
      "❌ Login notification email error:",
      error.message
    );

    throw error;
  }
};