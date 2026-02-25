// models/RatingModel.js
import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    rater: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true }, // who gives rating
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true }, // who receives rating
    item: { type: mongoose.Schema.Types.ObjectId, ref: "FoodPost"}, // the donation/item
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;
