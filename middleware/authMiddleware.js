import User from "../models/userModel.js";
import { sendResponse } from "../utils/responseHandler.js";
export const protect = async (req, res, next) => {
  // Check if user is logged in via session
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authorized" });
  }

  // Fetch user from database (exclude password)
  const user = await User.findById(req.session.userId).select("-password");
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Attach user to request object for later use in routes
  req.user = user;

  // Allow access to the next middleware or route handler
  next();
};

export const adminRoutes = async (req, res, next) => {
  // Check if user is logged in via session
  if (!req.session.userId) {
    return sendResponse(res, {
      status: 401,
      message: "Unauthorized",
    });
  }
// Fetch user from database
  const user = await User.findById(req.session.userId);

  if (!user || user.role !== "admin") {
    return sendResponse(res, {
      status: 403,
      message: "Admin access only",
    });
  }

  next();
};