import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const user = await User.findById(req.session.userId).select("-password");
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  req.user = user;
  next();
};
