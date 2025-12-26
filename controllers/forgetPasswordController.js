import User from "../models/userModel.js";
import { generateOTP, hashOTP, compareOTP } from "../utils/otpUtils.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendResponse } from "../utils/responseHandler.js";

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
// check the exit email
  const user = await User.findOne({ email });
  if (!user) return sendResponse(res, { message: "User not found", status: 404 });

// check the otp expiration
  if (Date.now() > user.otpExpires) {
    return sendResponse(res, { message: "OTP expired", status: 400 });
  }
// check the otp attempts
  if (user.otpAttempts >= 5) {
    return sendResponse(res, { message: "Too many attempts", status: 429 });
  }
// compare the otp
  const isValid = await compareOTP(otp, user.otp);
  if (!isValid) {
    user.otpAttempts += 1;
    await user.save();
    return sendResponse(res, { message: "Invalid OTP", status: 400 });
  }
// mark email as verified
  user.otp = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpResendCount = 0;
  // send confirmation email
await sendEmail({
  to: user.email,
  subject: "OTP Verified – Reset Your Password | Annapurna Bhandar",
  html: `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    padding: 30px;
  ">
    <div style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    ">

      <!-- Header -->
      <div style="
        background-color: #16a34a;
        color: white;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="margin: 0;">Annapurna Bhandar</h1>
        <p style="margin: 5px 0 0;">Password Reset Confirmation</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #16a34a;">OTP Verified Successfully 🎉</h2>

        <p>
          Hello <strong>${user.name || "User"}</strong>,
        </p>

        <p>
          Your One-Time Password (OTP) has been successfully verified.
          You can now safely proceed to reset your password.
        </p>

        <p>
          For your security, please reset your password as soon as possible.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/reset-password"
             style="
              background-color: #16a34a;
              color: #ffffff;
              padding: 14px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              display: inline-block;
             ">
            Reset Password
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          If you did not request this password reset, please ignore this email
          or contact our support team immediately.
        </p>
      </div>

      <!-- Footer -->
      <div style="
        background-color: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #64748b;
      ">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Annapurna Bhandar. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `,
});

  await user.save();
// send success response
  sendResponse(res, { message: "OTP verified successfully" });
};
// RESEND OTP

export const sendOtp = async (req, res) => {
  const { email } = req.body;
// check the exit email
  const user = await User.findOne({ email });
  if (!user) return sendResponse(res, { message: "User not found", status: 404 });
// limit the resend otp
  if (user.otpResendCount >= 5) {
    return sendResponse(res, { message: "Resend limit exceeded", status: 429 });
  }
// generate new otp
  const otp = generateOTP();
// hash the otp
  user.otp = await hashOTP(otp);
  user.otpExpires = Date.now() + 1 * 60 * 1000;
  user.otpAttempts = 0;
  user.otpResendCount += 1;
// save the user
  await user.save();
// send the otp via email
await sendEmail({
  to: user.email,
  subject: "Reset Password OTP | Annapurna Bhandar",
  html: `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    padding: 30px;
  ">
    <div style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    ">

      <!-- Header -->
      <div style="
        background-color: #16a34a;
        color: #ffffff;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="margin: 0;">Annapurna Bhandar</h1>
        <p style="margin: 5px 0 0;">Password Reset Request</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #16a34a;">Forgot Your Password?</h2>

        <p>Hello <strong>${user.name || "User"}</strong>,</p>

        <p>
          We received a request to reset your password.
          Please use the OTP below to continue.
        </p>

        <div style="
          background-color: #f1f5f9;
          border: 1px dashed #16a34a;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin: 25px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #475569;">
            Your One-Time Password (OTP)
          </p>
          <h1 style="
            margin: 10px 0 0;
            color: #16a34a;
            letter-spacing: 6px;
          ">
            ${otp}
          </h1>
        </div>

        <p>
          ⏱️ This OTP is valid for <strong>1 minute</strong>.
          Please do not share it with anyone.
        </p>

        <p style="font-size: 14px; color: #64748b;">
          If you did not request this password reset,
          please ignore this email or contact our support team.
        </p>
      </div>

      <!-- Footer -->
      <div style="
        background-color: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #64748b;
      ">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Annapurna Bhandar. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `,
});

// send success response
  sendResponse(res, { message: "OTP sent successfully" });
};
