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
    // Check if user is logged in
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }

    // Pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch notifications for the logged-in user
    const notifications = await Notification.find({
      $or: [
        { user: req.session.userId }, // personal notifications
        { user: { $exists: false } }  // global notifications
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);


    // Count total notifications for pagination
    const total = await Notification.countDocuments({
      user: req.session.userId,
    });

    // Generate pagination metadata
    const pagination = getPagination(page, limit, total);

    // Send response
    return sendResponse(res, {

      message: "Notifications fetched successfully",
      data: {
        notifications,
        pagination,
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