import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  deleteNotification
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getMyNotifications);
router.put("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);
export default router;
