import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
// Routes
// Get my notifications
router.get("/", protect, getMyNotifications);
// Mark notification as read
router.put("/:id/read", protect, markNotificationRead);
// Delete notification
router.delete("/:id", protect, deleteNotification);
// Mark all notifications as read
router.all("/read-all", protect, markAllNotificationsRead);
export default router;
