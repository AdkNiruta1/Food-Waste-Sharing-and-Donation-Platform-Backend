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

  await user.save();
// send success response
  sendResponse(res, { message: "Email verified successfully" });
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
    subject: "send OTP - Forget Password",
    html: `
      <h2>Forget Password</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>Valid for 1 minutes</p>
    `,
  });

  sendResponse(res, { message: "OTP sent successfully" });
};
