import User from "../models/userModel.js";
import { generateOTP, hashOTP, compareOTP } from "../utils/otpUtils.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendResponse } from "../utils/responseHandler.js";
import { logActivity } from "../utils/logger.js";
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
// check the exit email
  const user = await User.findOne({ email });
  if (!user) return sendResponse(res, { message: "User not found", status: 404 });
// check the email is verified
  if (user.emailVerified==="verified") {
    return sendResponse(res, { message: "Email already verified" });
  }
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
  user.emailVerified = "verified";
  user.otp = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpResendCount = 0;
await sendEmail({
  to: user.email,
  subject: "Email Verified 🎉 | Welcome to Annapurna Bhandar",
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
        <p style="margin: 5px 0 0;">Email Verification Successful</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #16a34a;">Welcome aboard 🎉</h2>

        <p>Hello <strong>${user.name || "User"}</strong>,</p>

        <p>
          We're happy to let you know that your email address has been
          <strong>successfully verified</strong>.
        </p>

        <p>
          Your account has been created and is currently under review.
          This process usually takes up to <strong>24 hours</strong>.
        </p>

        <p>
          Once the verification is complete, we will notify you via this email.
        </p>

        <div style="
          background-color: #f1f5f9;
          border-left: 4px solid #16a34a;
          padding: 15px;
          margin: 25px 0;
          border-radius: 6px;
        ">
          <p style="margin: 0;">
            🚨 If you did not initiate this request, please ignore this email
            or contact our support team immediately.
          </p>
        </div>

        <p>
          Thank you for joining <strong>Annapurna Bhandar</strong>.
          We’re excited to have you with us!
        </p>

        <p>
          Warm regards,<br />
          <strong>Annapurna Bhandar Team</strong>
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
  // Log activity
  await logActivity("Email Verified", user._id, user._id);
// send success response
  sendResponse(res, { message: "Email verified successfully" });
};
// RESEND OTP

export const sendOtp = async (req, res) => {
  const { email } = req.body;
// check the exit email
  const user = await User.findOne({ email });
  if (!user) return sendResponse(res, { message: "User not found", status: 404 });
// check the exit email
  if (user.emailVerified==="verified") {
    return sendResponse(res, { message: "Email already verified" });
  }
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
  subject: "Email Verification OTP 🔐 | Annapurna Bhandar",
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
        <p style="margin: 6px 0 0;">Email Verification</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #16a34a;">Verify your email 🔐</h2>

        <p>Hello <strong>${user.name || "User"}</strong>,</p>

        <p>
          Use the One-Time Password (OTP) below to verify your email address.
        </p>

        <!-- OTP Box -->
        <div style="
          margin: 25px 0;
          text-align: center;
        ">
          <span style="
            display: inline-block;
            font-size: 32px;
            letter-spacing: 6px;
            font-weight: bold;
            background-color: #f1f5f9;
            padding: 14px 28px;
            border-radius: 8px;
            color: #16a34a;
          ">
            ${otp}
          </span>
        </div>

        <p style="text-align: center;">
          ⏳ This OTP is valid for <strong>1 minute</strong>.
        </p>

        <div style="
          background-color: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 14px;
          margin: 25px 0;
          border-radius: 6px;
        ">
          <p style="margin: 0;">
            🚨 Do not share this OTP with anyone.
            Annapurna Bhandar will never ask for your OTP.
          </p>
        </div>

        <p>
          If you did not request this verification, please ignore this email.
        </p>

        <p>
          Regards,<br />
          <strong>Annapurna Bhandar Team</strong>
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
