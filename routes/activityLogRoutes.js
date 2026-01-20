import express from "express";
import {
  getLogs,
  getMyLogs,
  getUserLogs,
} from "../controllers/logController.js";
import { adminRoutes as isAdmin, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// get looged of users or mine
router.get("/my", protect, getMyLogs);

// get all logs
router.get("/", isAdmin, getLogs);
// get user logs by admin from id
router.get("/user/:userId", isAdmin, getUserLogs);

export default router;
