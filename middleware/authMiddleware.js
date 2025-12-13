import User from "../models/userModel.js";
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
