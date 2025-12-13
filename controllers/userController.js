import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { sendResponse } from "../utils/responseHandler.js";

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return sendResponse(res, { message: "User already exists", status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword, role });

    req.session.userId = user._id;

    sendResponse(res, {
      success: true,
      message: "Registered and logged in successfully",
      data: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    sendResponse(res, { message: error.message, status: 500 });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, { message: "Invalid email", status: 400 });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendResponse(res, { message: "Wrong password", status: 400 });

    req.session.userId = user._id;

    sendResponse(res, {
      message: "Logged in successfully",
      data: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    sendResponse(res, { message: error.message, status: 500 });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, { message: "Not logged in", status: 401 });
    }

    const user = await User.findById(req.session.userId).select("-password");
    if (!user) {
      return sendResponse(res, { message: "User not found", status: 404 });
    }

    sendResponse(res, {
      message: "Current user fetched successfully",
      data: user,
    });
  } catch (error) {
    sendResponse(res, { message: error.message, status: 500 });
  }
};

// LOGOUT USER
export const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return sendResponse(res, { message: "Logout failed", status: 500 });
    res.clearCookie("sid");
    sendResponse(res, { success: true, message: "Logged out successfully" });
  });
};
