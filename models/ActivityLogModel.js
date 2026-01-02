// models/ActivityLogModel.js
import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    metadata: {
      type: Object, // optional extra info (IP, role, etc.)
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
