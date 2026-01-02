// Import ActivityLog model to interact with activity_logs collection
import ActivityLog from "../models/ActivityLogModel.js";
// Standard response helper
import { sendResponse } from "../utils/responseHandler.js";

// Reusable pagination utility
import { getPagination } from "../utils/pagination.js";

/**
 * ======================================================
 * GET ALL ACTIVITY LOGS (ADMIN)
 * Supports filtering + pagination
 * ======================================================
 */
export const getLogs = async (req, res) => {
  try {
    // Extract optional filters from query params
    const { action, performedBy, targetUser } = req.query;

    // Build dynamic filter object
    const filter = {};

    if (action) filter.action = action;
    if (performedBy) filter.performedBy = performedBy;
    if (targetUser) filter.targetUser = targetUser;

    // Pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch logs with pagination, sorting, and population
    const logs = await ActivityLog.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("performedBy", "name email")
      .populate("targetUser", "name email");

    // Count total matching logs
    const total = await ActivityLog.countDocuments(filter);

    // Generate pagination metadata
    const pagination = getPagination(page, limit, total);

    // Send response
    return sendResponse(res, {
      message: "Activity logs fetched successfully",
      data: {
        logs,
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

/**
 * ======================================================
 * GET MY ACTIVITY LOGS (LOGGED-IN USER)
 * Shows only actions performed by current user
 * ======================================================
 */
export const getMyLogs = async (req, res) => {
  try {
    // Ensure user is logged in
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

    // Fetch logs performed by the current user
    const logs = await ActivityLog.find({
      performedBy: req.session.userId,
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("performedBy", "name email")
      .populate("targetUser", "name email");

    // Count total user logs
    const total = await ActivityLog.countDocuments({
      performedBy: req.session.userId,
    });

    // Pagination metadata
    const pagination = getPagination(page, limit, total);

    // Send response
    return sendResponse(res, {
      success: true,
      message: "My activity logs fetched successfully",
      data: {
        logs,
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

/**
 * ======================================================
 * GET SPECIFIC USER LOGS (ADMIN)
 * Includes actions performed by OR on the user
 * ======================================================
 */
export const getUserLogs = async (req, res) => {
  try {
    // Target user ID from route param
    const userId = req.params.userId;

    // Pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch logs where user is actor or target
    const logs = await ActivityLog.find({
      $or: [
        { performedBy: userId },
        { targetUser: userId },
      ],
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("performedBy", "name email")
      .populate("targetUser", "name email");

    // Count total matching logs
    const total = await ActivityLog.countDocuments({
      $or: [
        { performedBy: userId },
        { targetUser: userId },
      ],
    });

    // Pagination metadata
    const pagination = getPagination(page, limit, total);

    // Send response
    return sendResponse(res, {
      success: true,
      message: "User activity logs fetched successfully",
      data: {
        logs,
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
