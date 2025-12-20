import bcrypt from "bcryptjs";

// generate 6 digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// hash OTP
export const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

// compare OTP
export const compareOTP = async (otp, hashedOTP) => {
  return await bcrypt.compare(otp, hashedOTP);
};
