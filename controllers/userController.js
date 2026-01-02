import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { sendResponse } from "../utils/responseHandler.js";
import { saveCompressedImage } from "../utils/saveImage.js";
import path from "path";
import crypto from "crypto";

import { logActivity } from "../utils/logger.js";
import { sendEmail } from "../utils/sendEmail.js";
// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check required fields
    if (!name || !email || !password || !role || !phone || !address) {
      return sendResponse(res, { message: "All fields are required", status: 400 });
    }

    // Get uploaded files
    const docs = req.files || {};
    if (!docs.citizenship && !docs.pan && !docs.drivingLicense) {
      return sendResponse(res, {
        message: "At least one document image is required",
        status: 400,
      });
    }

    // Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return sendResponse(res, { message: "User email already exists", status: 400 });
    }

    const compressedDocs = {};

    // Compress & save uploaded files
    for (const key of ["citizenship", "pan", "drivingLicense", "profilePicture"]) {
      if (docs[key]) {
        const file = docs[key][0];
        const folder = key === "profilePicture" ? "uploads/profiles" : "uploads/documents";
        const filename = `${Date.now()}-${key}.jpg`;

        compressedDocs[key] = await saveCompressedImage(file.buffer, folder, filename);
      }
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
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

    // Log activity and create notification
    await logActivity("User Registered", user._id, user._id, {
      role: user.role,
    });

    // Send success response
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, { message: "Invalid email", status: 400 });

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendResponse(res, { message: "Wrong password", status: 400 });

    // Set session
    req.session.userId = user._id;
    // ✅ Log login
    await logActivity("User Logged In", user._id, user._id, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Send success response
    sendResponse(res, {
      message: "Logged in successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        status: user.accountVerified,
      },
    });
  } catch (error) {
    sendResponse(res, { message: error.message, status: 500 });
  }
};

// GET CURRENT LOGGED-IN USER
export const getMe = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, { message: "Not logged in", status: 401 });
    }
    // Fetch user from database
    const user = await User.findById(req.session.userId).select("-password");
    if (!user) return sendResponse(res, { message: "User not found", status: 404 });
    // Send user data
    sendResponse(res, {
      message: "Current user fetched successfully",
      data: user,
    });
  } catch (error) {
    sendResponse(res, { message: error.message, status: 500 });
  }
};

// LOGOUT USER
export const logoutUser = async (req, res) => {
  const userId = req.session.userId;
  // Destroy session
  req.session.destroy(async err => {
    if (err) return sendResponse(res, { message: "Logout failed", status: 500 });
    if (userId) {
      await logActivity("User Logged Out", userId, userId);
    }
    // Clear session cookie
    res.clearCookie("sid");
    sendResponse(res, { success: true, message: "Logged out successfully" });
  });
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    // Validate input
    if (!email || !newPassword) {
      return sendResponse(res, {
        status: 400,
        message: "Email and new password are required",
      });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: "User not found",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    // Save updated user
    await user.save();
    // Log activity
    await logActivity(
      "Password Reset",
      req.session.userId || user._id,
      user._id
    );


    // Send success response
    return sendResponse(res, {
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: "Failed to reset password",
    });
  }
};

// RESUBMIT DOCUMENTS
export const resubmitDocuments = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resubmitToken: hashedToken,
      resubmitTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendResponse(res, {
        status: 400,
        message: "Invalid or expired resubmission link",
      });
    }

    const docs = req.files || {};
    const updatedDocs = {};

    for (const key of ["citizenship", "pan", "drivingLicense"]) {
      if (docs[key]) {
        const file = docs[key][0];
        const folder = "uploads/documents";
        const filename = `${Date.now()}-${key}.jpg`;

        const savedPath = await saveCompressedImage(
          file.buffer,
          folder,
          filename
        );

        // normalize path for frontend
        updatedDocs[key] = savedPath.replace(/\\/g, "/");
      }
    }

    // 🔁 Replace old documents ONLY if new ones uploaded
    user.documents = {
      ...user.documents,
      ...updatedDocs,
    };

    // Reset verification flags
    user.accountVerified = "pending";
    user.resubmitToken = undefined;
    user.resubmitTokenExpires = undefined;

    await user.save();
    await logActivity("Documents Resubmitted", user._id, user._id);
    sendEmail({
      to: user.email,
      subject: "Documents Resubmitted | Annapurna Bhandar",
      html: `
        <div style="
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f6f8;
  padding: 30px;
">
  <div style="
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  ">
        <h2 style="color: #2f855a; margin-top: 0;">
          Documents Resubmitted Successfully
        </h2>

        <p style="font-size: 16px; color: #333333;">
          Hi <strong>${user.name}</strong>,
        </p>

        <p style="font-size: 16px; color: #333333; line-height: 1.6;">
          We’ve received your resubmitted documents successfully.  
          Our admin team will review them shortly.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 15px;
          margin: 20px 0;
          color: #166534;
          font-size: 15px;
        ">
          ⏳ <strong>Status:</strong> Pending admin verification  
        </div>

        <p style="font-size: 15px; color: #333333; line-height: 1.6;">
          You will receive another email once your documents are either approved or require further action.
        </p>

        <p style="font-size: 15px; color: #333333;">
          Thank you for your cooperation.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />

        <p style="font-size: 14px; color: #6b7280;">
          Best regards,<br />
          <strong>Annapurna Bhandar Team</strong>
        </p>

      </div>
    </div>

      `,
    });
    return sendResponse(res, {
      success: true,
      message: "Documents resubmitted successfully. Await admin verification.",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};