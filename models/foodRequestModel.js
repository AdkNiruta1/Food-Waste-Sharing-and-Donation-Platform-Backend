import mongoose from "mongoose";
// foodRequestModel == table where save requests
const foodRequestSchema = new mongoose.Schema({
  foodPost: { type: mongoose.Schema.Types.ObjectId, ref: "FoodPost", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  status: { type: String, enum: ["pending", "accepted", "completed", "rejected", "cancelled"], default: "pending" },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model("FoodRequest", foodRequestSchema);
