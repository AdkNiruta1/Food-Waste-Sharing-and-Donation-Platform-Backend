import express from "express";
import {
  getLogs,
  getMyLogs,
  getUserLogs,
} from "../controllers/logController.js";
import { adminRoutes as isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Logged-in user
router.get("/my", getMyLogs);

// Admin
router.get("/", isAdmin, getLogs);
router.get("/user/:userId", isAdmin, getUserLogs);

export default router;
