import Notification from "../models/NotificationsModel.js";
import { sendResponse } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
export const createNotification = async (userId, message) => {
  await Notification.create({ user: userId, message });
};
export const sendNotificationAll = async (message) => {
  await Notification.create({ message });
}
// GET /api/notifications/my
// Get my notifications
export const getMyNotifications = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }

    const userId = req.session.userId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ COMMON FILTER (VERY IMPORTANT)
    const filter = {
      $or: [
        { user: userId },              // personal
        { user: { $exists: false } },  // global
      ],
    };

    // 1️⃣ Paginated notifications
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 2️⃣ Correct total count (same filter)
    const total = await Notification.countDocuments(filter);

    // 3️⃣ Global seen / unseen counts (NOT paginated)
    const [seenCount, unseenCount] = await Promise.all([
      Notification.countDocuments({ ...filter, read: true }),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    const pagination = getPagination(page, limit, total);

    return sendResponse(res, {
      message: "Notifications fetched successfully",
      data: {
        notifications,
        pagination,
        counts: {
          total,
          seen: seenCount,
          unseen: unseenCount,
        },
      },
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};


// MARK NOTIFICATION AS READ
// PUT /api/notifications/mark-read/:id
export const markNotificationRead = async (req, res) => {
  try {
    // Ensure user is logged in
    const notification = await Notification.findOne({
      _id: req.params.id,
    });
    // Check if notification exists
    if (!notification) {
      return sendResponse(res, {
        status: 404,
        message: "Notification not found",
      });
    }
    // Mark as read
    notification.read = true;
    await notification.save();
    // Send response
    return sendResponse(res, {

      message: "Notification marked as read",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// mark all notifications as read
export const markAllNotificationsRead = async (req, res) => {
  try {
    // Ensure user is logged in
    await Notification.updateMany(
      { user: req.session.userId, read: false },
      { read: true }
    );
    // Send response
    return sendResponse(res, {
      message: "All notifications marked as read",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// delete notification
export const deleteNotification = async (req, res) => {
  try {
    // Ensure user is logged in
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
    });
    // Check if notification exists
    if (!notification) {
      return sendResponse(res, {
        status: 404,
        message: "Notification not found",
      });
    }
    // Send response
    return sendResponse(res, {
      message: "Notification deleted successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};