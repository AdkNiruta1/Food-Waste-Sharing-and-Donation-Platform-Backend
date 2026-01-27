// utils/logActivity.js
import ActivityLog from "../models/ActivityLogModel.js";
// Function to create an activity log
export const logActivity = async (
  action,
  performedBy,
  targetUser = null,
  metadata = {}
) => {
  try {
    // Create a new activity log
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
