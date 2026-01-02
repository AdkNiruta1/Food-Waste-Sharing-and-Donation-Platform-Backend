import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/:id/read", protect, markNotificationRead);
router.delete("/:id", protect, deleteNotification);
router.all("/read-all", protect, markAllNotificationsRead);
export default router;
