import User from "../models/userModel.js";
import { sendResponse } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { logActivity } from "../utils/logger.js";
import { createNotification } from "./notificationController.js";
import { Parser } from "json2csv";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import foodPostModel from "../models/foodPostModel.js";
import foodRequestModel from "../models/foodRequestModel.js";
import Rating from "../models/RatingModel.js";
import archiver from "archiver";
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
    // Total users
    const totalUsers = await User.countDocuments();

    // Total food posts
    const totalFoodPosts = await foodPostModel.countDocuments();

    // Total food requests
    const totalRequests = await foodRequestModel.countDocuments();

    // Average rating
    const ratingStats = await Rating.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const averageRating =
      ratingStats.length > 0
        ? Number(ratingStats[0].averageRating.toFixed(2))
        : 0;

    return sendResponse(res, {
      status: 200,
      data: {
        totalUsers,
        totalFoodPosts,
        totalRequests,
        averageRating,
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
    const users = await User.find()
      .select(
        "name email phone role emailVerified accountVerified rating ratingCount createdAt"
      )
      .lean();

    const fields = [
      "name",
      "email",
      "phone",
      "role",
      "emailVerified",
      "accountVerified",
      "rating",
      "ratingCount",
      "createdAt"
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    res.header("Content-Type", "text/csv");
    res.attachment("users.csv");
    return res.send(csv);

  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

export const exportFullAppReport = async (req, res) => {
  try {
    /* ================= USERS ================= */
    const users = await User.find()
      .select("-password -otp -otpExpires")
      .lean();

    const usersCSV = new Parser({
      fields: [
        "_id",
        "name",
        "email",
        "phone",
        "role",
        "address",
        "emailVerified",
        "accountVerified",
        "rejectionReason",
        "rating",
        "ratingCount",
        "createdAt",
      ],
    }).parse(users);

    /* ================= FOOD POSTS ================= */
    const foodPosts = await foodPostModel.find()
      .populate("donor", "name email phone address ")
      .lean();

    const foodPostsCSV = new Parser({
      fields: [
        "_id",
        "title",
        "description",
        "type",
        "quantity",
        "unit",
        "expiryDate",
        "city",
        "district",
        "pickupInstructions",
        "status",
        "donor.name",
        "donor.email",
        "donor.phone",
        "donor.address",
        "acceptedRequest",
        "createdAt",
      ],
    }).parse(foodPosts);

    /* ================= FOOD REQUESTS ================= */
    const foodRequests = await foodRequestModel.find()
      .populate("foodPost", "title description type quantity unit expiryDate city district pickupInstructions")
      .populate("receiver", "name email phone address")
      .lean();

    const foodRequestsCSV = new Parser({
      fields: [
        "_id",
        "foodPost.title",
        "foodPost.description",
        "foodPost.type",
        "foodPost.quantity",
        "foodPost.unit",
        "foodPost.expiryDate",
        "foodPost.city",
        "foodPost.district",
        "foodPost.pickupInstructions",
        "receiver.name",
        "receiver.email",
        "receiver.phone",
        "receiver.address",
        "status",
        "requestedAt",
        "acceptedAt",
        "createdAt",
      ],
    }).parse(foodRequests);

    /* ================= RATINGS ================= */
    const ratings = await Rating.find()
      .populate("rater", "name")
      .populate("receiver", "name")
      .lean();

    const ratingsCSV = new Parser({
      fields: [
        "_id",
        "rater.name",
        "receiver.name",
        "rating",
        "comment",
        "createdAt",
      ],
    }).parse(ratings);

    /* ================= ZIP FILE ================= */
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=full-app-report.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(res);

    archive.append(usersCSV, { name: "users.csv" });
    archive.append(foodPostsCSV, { name: "food-posts.csv" });
    archive.append(foodRequestsCSV, { name: "food-requests.csv" });
    archive.append(ratingsCSV, { name: "ratings.csv" });

    await archive.finalize();
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};
// export full report csv for a month
export const exportFullAppReportForMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    /* ================= USERS ================= */
    const users = await User.find({
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .select("-password -otp -otpExpires")
      .lean();

    const usersCSV = new Parser({
      fields: [
        "_id",
        "name",
        "email",
        "phone",
        "role",
        "address",
        "emailVerified",
        "accountVerified",
        "rejectionReason",
        "rating",
        "ratingCount",
        "createdAt",
      ],
    }).parse(users);

    /* ================= FOOD POSTS ================= */
    const foodPosts = await foodPostModel.find({
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .populate("donor", "name email phone address")
      .lean();

    const foodPostsCSV = new Parser({
      fields: [
        "_id",
        "title",
        "description",
        "type",
        "quantity",
        "unit",
        "expiryDate",
        "city",
        "district",
        "pickupInstructions",
        "status",
        "donor.name",
        "donor.email",
        "donor.phone",
        "donor.address",
        "acceptedRequest",
        "createdAt",
      ],
    }).parse(foodPosts);

    /* ================= FOOD REQUESTS ================= */
    const foodRequests = await foodRequestModel.find({
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .populate("foodPost", "title description type quantity unit expiryDate city district pickupInstructions")
      .populate("receiver", "name email phone address")
      .lean();

    const foodRequestsCSV = new Parser({
      fields: [
        "_id",
        "foodPost.title",
        "foodPost.description",
        "foodPost.type",
        "foodPost.quantity",
        "foodPost.unit",
        "foodPost.expiryDate",
        "foodPost.city",
        "foodPost.district",
        "foodPost.pickupInstructions",
        "receiver.name",
        "receiver.email",
        "receiver.phone",
        "receiver.address",
        "status",
        "requestedAt",
        "acceptedAt",
        "createdAt",
      ],
    }).parse(foodRequests);

    /* ================= RATINGS ================= */
    const ratings = await Rating.find({
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .populate("rater", "name")
      .populate("receiver", "name")
      .lean();

    const ratingsCSV = new Parser({
      fields: [
        "_id",
        "rater.name",
        "receiver.name",
        "rating",
        "comment",
        "createdAt",
      ],
    }).parse(ratings);

    /* ================= ZIP FILE ================= */
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=full-app-report.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(res);

    archive.append(usersCSV, { name: "users.csv" });
    archive.append(foodPostsCSV, { name: "food-posts.csv" });
    archive.append(foodRequestsCSV, { name: "food-requests.csv" });
    archive.append(ratingsCSV, { name: "ratings.csv" });

    await archive.finalize();
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

// get the list of food post with request deatils and donor details
export const getListFoodPost = async (req, res) => {
  try {
    const foodPosts = await foodPostModel
      .find()
      .populate("donor")
      .populate("acceptedRequest", "receiver")
      .lean();

    return sendResponse(res, {
      status: 200,
      data: foodPosts,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

// get the food post with request deatils and donor details
export const getFoodPost = async (req, res) => {
  try {
    const foodPost = await foodPostModel
      .findById(req.params.id)
      .populate("donor")
      .populate("acceptedRequest", "receiver")
      .lean();

    return sendResponse(res, {
      status: 200,
      data: foodPost,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
//  get the donations over time
export const getDonationsOverTime = async (req, res) => {
  try {
    // last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const donations = await foodPostModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id.day",
          donations: "$count",
        },
      },
    ]);

    // Map MongoDB day numbers → labels
    const daysMap = {
      1: "Sun",
      2: "Mon",
      3: "Tue",
      4: "Wed",
      5: "Thu",
      6: "Fri",
      7: "Sat",
    };

    // Ensure all days appear (even with 0 donations)
    const result = Object.values(daysMap).map(day => {
      const found = donations.find(d => daysMap[d.day] === day);
      return {
        date: day,
        donations: found ? found.donations : 0,
      };
    });

    return sendResponse(res, {
      status: 200,
      data: result,
    });

  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// get the food type distribution
export const getFoodTypeDistribution = async (req, res) => {
  try {
    const result = await foodPostModel.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const cookedCount =
      result.find((r) => r._id === "cooked")?.count || 0;

    const otherCount =
      result.find((r) => r._id === "other")?.count || 0;

    const total = cookedCount + otherCount;

    // Avoid division by zero
    const distribution = [
      {
        name: "Cooked",
        value: total === 0 ? 0 : Math.round((cookedCount / total) * 100),
      },
      {
        name: "Other",
        value: total === 0 ? 0 : Math.round((otherCount / total) * 100),
      },
    ];

    return sendResponse(res, {
      status: 200,
      data: distribution,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

// Request Status Overview
export const getRequestStatusOverview = async (req, res) => {
  try {
    // Aggregate requests across all donors
    const statusCounts = await foodRequestModel.aggregate([
      {
        $group: {
          _id: "$status",      // group by request status
          count: { $sum: 1 },  // count requests
        },
      },
    ]);

    const allStatuses = ["pending", "accepted", "completed", "rejected", "cancelled"];
    const chartData = allStatuses.map((status) => {
      const found = statusCounts.find((s) => s._id === status);
      return {
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count: found ? found.count : 0,
      };
    });

    return sendResponse(res, {
      status: 200,
      message: "Admin request status overview fetched successfully",
      data: chartData,
    });
  } catch (error) {
    console.error(error);
    return sendResponse(res, { status: 500, message: error.message });
  }
};

