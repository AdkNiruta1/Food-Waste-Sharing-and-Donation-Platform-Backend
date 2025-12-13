import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { sendResponse } from "../utils/responseHandler.js";
import { saveCompressedImage } from "../utils/saveImage.js";
import path from "path";

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password || !role || !phone || !address) {
      return sendResponse(res, { message: "All fields are required", status: 400 });
    }

    const docs = req.files || {};
    if (!docs.citizenship && !docs.pan && !docs.drivingLicense) {
      return sendResponse(res, {
        message: "At least one document image is required",
        status: 400,
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return sendResponse(res, { message: "User email already exists", status: 400 });
    }

    const compressedDocs = {};

    for (const key of ["citizenship", "pan", "drivingLicense", "profilePicture"]) {
      if (docs[key]) {
        const file = docs[key][0];

        const folder =
          key === "profilePicture" ? "uploads/profiles" : "uploads/documents";

        const filename = `${Date.now()}-${key}.jpg`;

        compressedDocs[key] = await saveCompressedImage(
          file.buffer,
          folder,
          filename
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      documents: {
        citizenship: compressedDocs.citizenship || null,
        pan: compressedDocs.pan || null,
        drivingLicense: compressedDocs.drivingLicense || null,
      },
      profilePicture: compressedDocs.profilePicture || null,
    });

    req.session.userId = user._id;

    sendResponse(res, {
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: user.role,
      },
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
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.verified },
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
