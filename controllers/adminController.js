import User from "../models/userModel.js";
import { sendResponse } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { logActivity } from "../utils/logger.js";
import { createNotification } from "./notificationController.js";
import { Parser } from "json2csv";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

// ADMIN CONTROLLER FUNCTIONS
// Get all users with optional filters
export const getAllUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { role, verified, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (verified !== undefined) filter.verified = verified === "true";

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    filter.role = { $ne: "admin" };
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    // ✅ Use pagination utility here
    const pagination = getPagination(page, limit, total);

    return sendResponse(res, {
      message: "Users fetched successfully",
      data: {
        users,
        pagination,
      },
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};


// Get user by ID
/// GET /api/admin/user/:id
// Get user details by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    // Check if user exists
    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: "User not found",
      });
    }
    // Send response
    return sendResponse(res, {
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

/**
 * @desc    Verify user documents
 * @route   PUT /api/admin/verify-user/:id
 * @access  Admin
 */
// Verify user documents by admin
export const verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    // Check if user exists
    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: "User not found",
      });
    }
    // Update user verification status
    user.accountVerified = "verified";
    await user.save();
    await logActivity("User Verified", req.session.userId, user._id);
    await createNotification(user._id, "Your account has been verified by admin");
    await sendEmail({
      to: user.email,
      subject: "Account Verified Successfully | Annapurna Bhandar",
      html: `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    padding: 30px;
  ">
    <div style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    ">

      <!-- Header -->
      <div style="
        background-color: #16a34a;
        color: #ffffff;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="margin: 0;">Annapurna Bhandar</h1>
        <p style="margin: 5px 0 0;">Account Verification</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #16a34a;">Your Account is Verified ✅</h2>

        <p>
          Hello <strong>${user.name || "User"}</strong>,
        </p>

        <p>
          We’re happy to inform you that your account has been
          <strong>successfully verified</strong> by our admin team.
        </p>

        <p>
          You can now log in and start using all features of
          <strong>Annapurna Bhandar</strong>.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/login"
             style="
              background-color: #16a34a;
              color: #ffffff;
              padding: 14px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              display: inline-block;
             ">
            Login Now
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          If you have any questions or need assistance, feel free to
          contact our support team.
        </p>
      </div>

      <!-- Footer -->
      <div style="
        background-color: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #64748b;
      ">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Annapurna Bhandar. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `,
    });

    // Send response
    return sendResponse(res, {
      message: "User verified successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

// Reject user documents by admin

export const rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    // Check if user exists
    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: "User not found",
      });
    }

    // Update user verification status
    user.accountVerified = "rejected";
    user.rejectionReason = req.body.reason || "Not specified";
    const token = crypto.randomBytes(32).toString("hex");
    user.resubmitToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resubmitTokenExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
    await user.save();
    // Send notification and log activity
    await logActivity("User Rejected", req.session.userId, user._id);
    await createNotification(
      user._id,
      "Your documents were rejected. Please resubmit with valid documents."
    );
    // Send rejection email with resubmit link
    const resubmitLink = `${process.env.CLIENT_URL}/resubmit-documents/${token}`;

    //send email notification could be added here
    await sendEmail({
      to: user.email,
      subject: "Document Verification Failed – Action Required | Annapurna Bhandar",
      html: `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    padding: 30px;
  ">
    <div style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    ">

      <!-- Header -->
      <div style="
        background-color: #dc2626;
        color: white;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="margin: 0;">Annapurna Bhandar</h1>
        <p style="margin: 5px 0 0;">Document Verification Failed</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #334155;">
        <h2 style="color: #dc2626;">Action Required ❗</h2>

        <p>
          Hello <strong>${user.name || "User"}</strong>,
        </p>

        <p>
          Thank you for registering on <strong>Annapurna Bhandar</strong>.
          After reviewing your submitted documents, we regret to inform you
          that they <strong>could not be verified</strong>.
        </p>

        <p style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626;">
          ⚠️ <strong>Important:</strong> Your account access is currently
          <strong>restricted</strong>. You will not be able to log in
          until valid documents are resubmitted and verified by our admin team.
        </p>

        <p>
          Please ensure that the documents you upload are:
        </p>

        <ul style="margin-left: 20px;">
          <li>Clear and readable</li>
          <li>Valid and not expired</li>
          <li>Belong to you</li>
        </ul>
        <p>Click below to securely re-upload your documents:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resubmitLink}"
             style="
              background-color: #dc2626;
              color: #ffffff;
              padding: 14px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              display: inline-block;
             ">
            Resubmit Documents
          </a>
        </div>
        <p>This link expires in 24 hours.</p>
        <p style="font-size: 14px; color: #64748b;">
          If you believe this was a mistake or need help,
          please contact our support team.
        </p>
      </div>

      <!-- Footer -->
      <div style="
        background-color: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #64748b;
      ">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Annapurna Bhandar. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `,
    });

    // Send response
    return sendResponse(res, {
      message: "User rejected successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// Delete user by ID
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    // Check if user exists
    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: "User not found",
      });
    }
    // Log activity
    await logActivity("User Deleted", req.session.userId, user._id);
    await createNotification(user._id, "Your account has been deleted by admin");
    await sendEmail({
      to: user.email,
      subject: "Account Deleted | Annapurna Bhandar",
      html: `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f6f8;
        padding: 30px;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
          <!-- Header -->
          <div style="
            background-color: #dc2626;
            padding: 15px;
            text-align: center;
            color: #ffffff;
          ">
            <h1 style="margin: 0;">Account Deleted</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px; color: #334155;">
            <p>
              Hello <strong>${user.name || "User"}</strong>,
            </p>

            <p>
              We regret to inform you that your account has been <strong>permanently deleted</strong>.
            </p>

            <p>
              If you have any questions or concerns, please contact our support team.
            </p>
          </div>

          <!-- Footer -->
          <div style="
            background-color: #f1f5f9;
            padding: 15px;
            text-align: center;
            font-size: 13px;
            color: #64748b;
          ">
            <p style="margin: 0;">
              © ${new Date().getFullYear()} Annapurna Bhandar. All rights reserved.
            </p>
          </div>

        </div>
      </div>
      `,
    });
    // Send response
    return sendResponse(res, {
      message: "User deleted successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
/// GET /api/admin/stats
// Get admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    // Get number of users
    const totalUsers = await User.countDocuments();
    const donors = await User.countDocuments({ role: "donor" });
    const recipients = await User.countDocuments({ role: "recipient" });
    const verifiedUsers = await User.countDocuments({ verified: true });
    const pendingUsers = await User.countDocuments({ verified: false });
    // Send response
    return sendResponse(res, {
      data: {
        totalUsers,
        donors,
        recipients,
        verifiedUsers,
        pendingUsers,
      },
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

// Export users as CSV
export const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    // Convert users to CSV
    const fields = ["name", "email", "role", "phone", "verified", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(users);
    // Set response headers and send CSV
    res.header("Content-Type", "text/csv");
    res.attachment("users.csv");
    await logActivity("Exported Users CSV", req.session.userId);
    return res.send(csv);
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};
