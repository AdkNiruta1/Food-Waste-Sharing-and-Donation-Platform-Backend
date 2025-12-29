// utils/logActivity.js
import ActivityLog from "../models/ActivityLogModel.js";

export const logActivity = async (
  action,
  performedBy,
  targetUser = null,
  metadata = {}
) => {
  try {
    await ActivityLog.create({
      action,
      performedBy,
      targetUser,
      metadata,
    });
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
};
