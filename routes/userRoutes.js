import express from "express";
import { registerUser, loginUser, logoutUser,getMe, updatePassword } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import { verifyOtp, sendOtp as resendOtp } from "../controllers/otpController.js";

const router = express.Router();

// -------------------------
// USER REGISTRATION ROUTE
// -------------------------
// Uses Multer to handle multiple file uploads (profile picture & documents)
// Then calls registerUser controller
router.post(
  "/register",
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "citizenship", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
  ]),
  registerUser
);

// -------------------------
// USER LOGIN ROUTE
// -------------------------
router.post("/login", loginUser);

// -------------------------
// GET CURRENT USER INFO
// -------------------------
// Protected route; only accessible if authenticated
router.get("/me", protect, getMe); // req.user is set in protect middleware
// -------------------------
// USER LOGOUT ROUTE
// -------------------------
router.post("/logout",protect,logoutUser);
// OTP ROUTES
router.post("/verify-otp", verifyOtp);
// Resend OTP
router.post("/send-otp", resendOtp);

router.put("/update-password", protect, updatePassword);


export default router;
