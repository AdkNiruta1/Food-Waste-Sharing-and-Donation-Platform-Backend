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
import ratingRoutes from "./routes/ratingRoutes.js"
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { setupLiveLocationSocket } from "./controllers/liveLocationSocket.js";
// Load environment variables
dotenv.config();
// Create Express app
const app = express();
// Create HTTP server
const server = http.createServer(app);
setupLiveLocationSocket(server);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Parse JSON
app.use(express.json());

// CORS MUST BE HERE (BEFORE session & routes)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ SESSION AFTER CORS
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET, // MUST exist in .env
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false, //  MUST be false in localhost
      sameSite: "lax",
    },
  })
);
// Static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// Routes
// routes for users
app.use("/api/users", userRoutes);
// routes for admin
app.use("/api/admin", adminRoutes);
//  routes for notifications
app.use("/api/notifications", notificationRoutes);
// routes for activity logs
app.use("/api/activity-logs", activityLogRoutes);
// routes for food donations
app.use("/api/food-donations", foodDonationRoutes)
// routes for ratings
app.use("/api/ratings", ratingRoutes)
// routes for contact
app.use("/api/contact", contactRoutes)


// Server
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server running on port ${PORT}`);
});

