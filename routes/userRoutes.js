import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();
// Multer setup for file uploads
// signup route with document uploads
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

// login route
router.post("/login", loginUser);
// protected route to get user info
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
