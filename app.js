// app.js
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";
import foodDonationRoutes from "./routes/foodDonationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();

const app = express();

// DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Middleware
app.use(express.json());

app.use(cors({
  origin: ["https://aannapurna.netlify.app","http://localhost:5173"],
  credentials: true,
}));

app.set("trust proxy", 1);

app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),
}));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/food-donations", foodDonationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/ratings", ratingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;