import mongoose from "mongoose";

const foodPostSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["cooked", "other"], 
      required: true 
    },
    quantity: { type: Number, required: true },
    unit: { 
      type: String, 
      enum: ["kg", "lbs", "items", "portions", "liters", "bottles"], 
      required: true 
    },
    expiryDate: { type: Date, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    pickupInstructions: { type: String, required: true },
    photo: { type: String }, // optional URL/path
    status: { type: String, enum: ["available", "accepted","expired", "completed"], default: "available" },
     acceptedRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FoodRequest" },
  },
  { timestamps: true }
);
foodPostSchema.virtual("requests", {
  ref: "FoodRequest",
  localField: "_id",
  foreignField: "foodPost",
});
export default mongoose.model("FoodPost", foodPostSchema);
