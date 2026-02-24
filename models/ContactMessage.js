import mongoose from "mongoose";
// ContactMessage model == table
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      minlength: 10,
    },
    inquiryType: {
      type: String,
      enum: ["general", "support", "partnership", "feedback"],
      default: "general",
    },
    subscribe: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["new", "read"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ContactMessage", contactMessageSchema);
