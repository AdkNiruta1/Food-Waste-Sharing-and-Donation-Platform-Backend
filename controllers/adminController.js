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

    const matchStage = {
      role: { $ne: "admin" },
    };

    if (role) matchStage.role = role;
    if (verified !== undefined) {
      matchStage.accountVerified = verified === "true" ? "verified" : "pending";
    }

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Aggregation
    const users = await User.aggregate([
      { $match: matchStage },

      // 🔹 Requests count (recipient)
      {
        $lookup: {
          from: "foodrequests",
          localField: "_id",
          foreignField: "receiver",
          as: "requests",
        },
      },

      // 🔹 Donations count (donor)
      {
        $lookup: {
          from: "foodposts",
          localField: "_id",
          foreignField: "donor",
          as: "donations",
        },
      },

      // 🔹 Add counts
      {
        $addFields: {
          requestCount: { $size: "$requests" },
          donationCount: { $size: "$donations" },
        },
      },

      // 🔹 Remove arrays (keep response small)
      {
        $project: {
          password: 0,
          requests: 0,
          donations: 0,
          otp: 0,
          otpExpires: 0,
        },
      },

      // 🔹 Sort + paginate
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // 🔹 Total users count (without pagination)
    const total = await User.countDocuments(matchStage);

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

export const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "name email phone role emailVerified accountVerified rating ratingCount createdAt"
      )
      .lean();

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=users.pdf");
    doc.pipe(res);

    // ── Title ──────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Users Report", { align: "center" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1);

    // ── Table config ───────────────────────────────────────────
    const columns = [
      { label: "Name",             key: "name",            width: 90  },
      { label: "Email",            key: "email",           width: 130 },
      { label: "Phone",            key: "phone",           width: 80  },
      { label: "Role",             key: "role",            width: 55  },
      { label: "Email Verified",   key: "emailVerified",   width: 70  },
      { label: "Acct Verified",    key: "accountVerified", width: 65  },
      { label: "Rating",           key: "rating",          width: 45  },
      { label: "Rating Count",     key: "ratingCount",     width: 65  },
      { label: "Created At",       key: "createdAt",       width: 100 },
    ];

    const ROW_HEIGHT  = 20;
    const HEADER_H    = 22;
    const startX      = doc.page.margins.left;
    let   y           = doc.y;

    const drawRow = (rowData, isHeader = false) => {
      // row background
      doc
        .rect(startX, y, columns.reduce((s, c) => s + c.width, 0), isHeader ? HEADER_H : ROW_HEIGHT)
        .fill(isHeader ? "#2563EB" : rowData._alt ? "#F1F5F9" : "#FFFFFF");

      doc
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isHeader ? 9 : 8)
        .fillColor(isHeader ? "#FFFFFF" : "#1E293B");

      let x = startX;
      columns.forEach((col) => {
        let value = isHeader ? col.label : rowData[col.key];

        if (!isHeader) {
          if (value === undefined || value === null) value = "—";
          else if (typeof value === "boolean")       value = value ? "Yes" : "No";
          else if (col.key === "createdAt")          value = new Date(value).toLocaleDateString();
          else if (col.key === "rating")             value = Number(value).toFixed(1);
          else                                       value = String(value);
        }

        doc.text(value, x + 4, y + (isHeader ? 7 : 6), {
          width:    col.width - 8,
          ellipsis: true,
          lineBreak: false,
        });

        x += col.width;
      });

      // row border
      doc
        .rect(startX, y, columns.reduce((s, c) => s + c.width, 0), isHeader ? HEADER_H : ROW_HEIGHT)
        .strokeColor("#CBD5E1")
        .stroke();

      y += isHeader ? HEADER_H : ROW_HEIGHT;
    };

    // ── Header row ─────────────────────────────────────────────
    drawRow(null, true);

    // ── Data rows ──────────────────────────────────────────────
    users.forEach((user, i) => {
      // new page if not enough space
      if (y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(null, true);          // repeat header on new page
      }

      drawRow({ ...user, _alt: i % 2 !== 0 });
    });

    // ── Footer ─────────────────────────────────────────────────
    doc
      .moveDown(1)
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(`Total records: ${users.length}`, startX, y + 8);

    doc.end();
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};
// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const fmt = {
  bool: (v) => (v === true ? "Yes" : v === false ? "No" : "—"),
  date: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
  str:  (v) => (v === undefined || v === null || v === "" ? "—" : String(v)),
  num:  (v, decimals = 1) => (v === undefined || v === null ? "—" : Number(v).toFixed(decimals)),
  nested: (obj, path) => {
    const val = path.split(".").reduce((o, k) => o?.[k], obj);
    return val === undefined || val === null ? "—" : String(val);
  },
};

/**
 * Draw a full-width table.
 * @param {PDFDocument} doc
 * @param {number}      startX
 * @param {object[]}    columns  – [{ label, key, width, format? }]
 * @param {object[]}    rows
 * @param {{ y: number }} cursor – shared mutable y-position ref
 */
function drawTable(doc, startX, columns, rows, cursor) {
  const ROW_H  = 18;
  const HEAD_H = 22;
  const totalW = columns.reduce((s, c) => s + c.width, 0);

  const drawHeader = () => {
    doc
      .rect(startX, cursor.y, totalW, HEAD_H)
      .fill("#1E40AF");

    let x = startX;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
    columns.forEach((col) => {
      doc.text(col.label, x + 4, cursor.y + 7, {
        width: col.width - 8,
        ellipsis: true,
        lineBreak: false,
      });
      x += col.width;
    });

    doc.rect(startX, cursor.y, totalW, HEAD_H).strokeColor("#3B82F6").stroke();
    cursor.y += HEAD_H;
  };

  const drawDataRow = (row, alt) => {
    doc
      .rect(startX, cursor.y, totalW, ROW_H)
      .fill(alt ? "#F8FAFC" : "#FFFFFF");

    let x = startX;
    doc.font("Helvetica").fontSize(7.5).fillColor("#1E293B");
    columns.forEach((col) => {
      let val;
      if (col.format) {
        val = col.format(row);
      } else if (col.key.includes(".")) {
        val = fmt.nested(row, col.key);
      } else {
        val = fmt.str(row[col.key]);
      }

      doc.text(val, x + 4, cursor.y + 5, {
        width: col.width - 8,
        ellipsis: true,
        lineBreak: false,
      });
      x += col.width;
    });

    doc.rect(startX, cursor.y, totalW, ROW_H).strokeColor("#E2E8F0").stroke();
    cursor.y += ROW_H;
  };

  drawHeader();

  rows.forEach((row, i) => {
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    if (cursor.y + ROW_H > pageBottom) {
      doc.addPage();
      cursor.y = doc.page.margins.top;
      drawHeader();
    }
    drawDataRow(row, i % 2 !== 0);
  });
}

/**
 * Draw a section title block with coloured bar.
 */
function drawSectionTitle(doc, title, subtitle, cursor) {
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  if (cursor.y + 50 > pageBottom) {
    doc.addPage();
    cursor.y = doc.page.margins.top;
  }

  const startX = doc.page.margins.left;
  const width  = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.rect(startX, cursor.y, 4, 32).fill("#2563EB");
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#0F172A")
    .text(title, startX + 12, cursor.y + 2);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748B")
    .text(subtitle, startX + 12, cursor.y + 18);

  cursor.y += 42;

  // thin divider
  doc.rect(startX, cursor.y, width, 1).fill("#E2E8F0");
  cursor.y += 8;
}

// ─────────────────────────────────────────────
//  Main handler
// ─────────────────────────────────────────────
export const exportFullAppReport = async (req, res) => {
  try {
    /* ── Fetch data ─────────────────────────────────────────── */
    const [users, foodPosts, foodRequests, ratings] = await Promise.all([
      User.find().select("-password -otp -otpExpires").lean(),
      foodPostModel.find().populate("donor", "name email phone address").lean(),
      foodRequestModel
        .find()
        .populate("foodPost", "title description type quantity unit expiryDate city district pickupInstructions")
        .populate("receiver", "name email phone address")
        .lean(),
      Rating.find().populate("rater", "name").populate("receiver", "name").lean(),
    ]);

    /* ── Bootstrap PDF ──────────────────────────────────────── */
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
      info: { Title: "Full App Report", Author: "System Export" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=full-app-report.pdf");
    doc.pipe(res);

    const startX  = doc.page.margins.left;
    const pageW   = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cursor  = { y: doc.page.margins.top };

    /* ── Cover / Summary ────────────────────────────────────── */
    // main title
    doc
      .rect(startX, cursor.y, pageW, 50)
      .fill("#1E3A8A");
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#FFFFFF")
      .text("Full Application Report", startX + 16, cursor.y + 10, { width: pageW - 32 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#BFDBFE")
      .text(`Exported on ${new Date().toLocaleString()}`, startX + 16, cursor.y + 34, { width: pageW - 32 });
    cursor.y += 62;

    // summary cards  (4 boxes in a row)
    const cardW   = (pageW - 30) / 4;
    const cardH   = 48;
    const summaryItems = [
      { label: "Total Users",         value: users.length,       color: "#2563EB" },
      { label: "Total Food Posts",    value: foodPosts.length,   color: "#16A34A" },
      { label: "Total Food Requests", value: foodRequests.length,color: "#D97706" },
      { label: "Total Ratings",       value: ratings.length,     color: "#7C3AED" },
    ];

    summaryItems.forEach((item, i) => {
      const cx = startX + i * (cardW + 10);
      doc.rect(cx, cursor.y, cardW, cardH).fill("#F8FAFC").stroke();
      doc.rect(cx, cursor.y, 4, cardH).fill(item.color);
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(item.color)
        .text(String(item.value), cx + 12, cursor.y + 6, { width: cardW - 16 });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#64748B")
        .text(item.label, cx + 12, cursor.y + 32, { width: cardW - 16 });
    });
    cursor.y += cardH + 24;

    /* ══════════════════════════════════════════
       SECTION 1 – USERS
    ══════════════════════════════════════════ */
    drawSectionTitle(doc, "Users", `${users.length} records`, cursor);

    drawTable(doc, startX, [
      { label: "Name",             key: "name",            width: 90  },
      { label: "Email",            key: "email",           width: 130 },
      { label: "Phone",            key: "phone",           width: 75  },
      { label: "Role",             key: "role",            width: 50  },
      { label: "Address",          key: "address",         width: 90  },
      { label: "Email Verified",   key: "emailVerified",   width: 65,  format: (r) => fmt.bool(r.emailVerified)  },
      { label: "Acct Verified",    key: "accountVerified", width: 65,  format: (r) => fmt.bool(r.accountVerified) },
      { label: "Rating",           key: "rating",          width: 45,  format: (r) => fmt.num(r.rating)          },
      { label: "Created At",       key: "createdAt",       width: 90,  format: (r) => fmt.date(r.createdAt)      },
    ], users, cursor);

    /* ══════════════════════════════════════════
       SECTION 2 – FOOD POSTS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Food Posts", `${foodPosts.length} records`, cursor);

    drawTable(doc, startX, [
      { label: "Title",        key: "title",                 width: 90  },
      { label: "Type",         key: "type",                  width: 50  },
      { label: "Quantity",     key: "quantity",              width: 50  },
      { label: "Unit",         key: "unit",                  width: 40  },
      { label: "City",         key: "city",                  width: 60  },
      { label: "District",     key: "district",              width: 65  },
      { label: "Status",       key: "status",                width: 60  },
      { label: "Expiry",       key: "expiryDate",            width: 75,  format: (r) => fmt.date(r.expiryDate)   },
      { label: "Donor",        key: "donor.name",            width: 80  },
      { label: "Donor Email",  key: "donor.email",           width: 110 },
      { label: "Created At",   key: "createdAt",             width: 90,  format: (r) => fmt.date(r.createdAt)   },
    ], foodPosts, cursor);

    /* ══════════════════════════════════════════
       SECTION 3 – FOOD REQUESTS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Food Requests", `${foodRequests.length} records`, cursor);

    drawTable(doc, startX, [
      { label: "Post Title",   key: "foodPost.title",        width: 100 },
      { label: "Type",         key: "foodPost.type",         width: 50  },
      { label: "Qty",          key: "foodPost.quantity",     width: 35  },
      { label: "Unit",         key: "foodPost.unit",         width: 35  },
      { label: "City",         key: "foodPost.city",         width: 60  },
      { label: "District",     key: "foodPost.district",     width: 65  },
      { label: "Receiver",     key: "receiver.name",         width: 80  },
      { label: "Receiver Email", key: "receiver.email",      width: 110 },
      { label: "Status",       key: "status",                width: 60  },
      { label: "Requested At", key: "requestedAt",           width: 85,  format: (r) => fmt.date(r.requestedAt) },
      { label: "Accepted At",  key: "acceptedAt",            width: 85,  format: (r) => fmt.date(r.acceptedAt)  },
    ], foodRequests, cursor);

    /* ══════════════════════════════════════════
       SECTION 4 – RATINGS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Ratings", `${ratings.length} records`, cursor);

    drawTable(doc, startX, [
      { label: "Rater",      key: "rater.name",    width: 130 },
      { label: "Receiver",   key: "receiver.name", width: 130 },
      { label: "Rating",     key: "rating",        width: 60,  format: (r) => fmt.num(r.rating) },
      { label: "Comment",    key: "comment",       width: 310 },
      { label: "Created At", key: "createdAt",     width: 100, format: (r) => fmt.date(r.createdAt) },
    ], ratings, cursor);

    /* ── Page numbers ───────────────────────────────────────── */
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#94A3B8")
        .text(
          `Page ${i + 1} of ${totalPages}`,
          doc.page.margins.left,
          doc.page.height - doc.page.margins.bottom + 8,
          { align: "right", width: pageW }
        );
    }

    doc.end();
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};
// export full report csv for a month
export const exportFullAppReportForMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 1);

    const monthLabel = startDate.toLocaleString("default", { month: "long", year: "numeric" });

    /* ── Fetch data (parallel) ──────────────────────────────── */
    const [users, foodPosts, foodRequests, ratings] = await Promise.all([
      User.find({ createdAt: { $gte: startDate, $lt: endDate } })
        .select("-password -otp -otpExpires")
        .lean(),
      foodPostModel
        .find({ createdAt: { $gte: startDate, $lt: endDate } })
        .populate("donor", "name email phone address")
        .lean(),
      foodRequestModel
        .find({ createdAt: { $gte: startDate, $lt: endDate } })
        .populate("foodPost", "title description type quantity unit expiryDate city district pickupInstructions")
        .populate("receiver", "name email phone address")
        .lean(),
      Rating.find({ createdAt: { $gte: startDate, $lt: endDate } })
        .populate("rater", "name")
        .populate("receiver", "name")
        .lean(),
    ]);

    /* ── Bootstrap PDF ──────────────────────────────────────── */
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
      bufferPages: true,
      info: {
        Title:  `Monthly Report – ${monthLabel}`,
        Author: "System Export",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-${year}-${String(month).padStart(2, "0")}.pdf`
    );
    doc.pipe(res);

    const startX = doc.page.margins.left;
    const pageW  = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
    const cursor = { y: doc.page.margins.top };

    /* ── Cover / Summary ────────────────────────────────────── */
    // title band
    doc.rect(startX, cursor.y, pageW, 56).fill("#1E3A8A");
    doc
      .font("Helvetica-Bold").fontSize(20).fillColor("#FFFFFF")
      .text("Monthly Application Report", startX + 16, cursor.y + 8, { width: pageW - 32 });
    doc
      .font("Helvetica-Bold").fontSize(13).fillColor("#93C5FD")
      .text(monthLabel, startX + 16, cursor.y + 30, { width: pageW - 32 });
    doc
      .font("Helvetica").fontSize(8).fillColor("#BFDBFE")
      .text(
        `Period: ${startDate.toLocaleDateString()} – ${new Date(endDate - 1).toLocaleDateString()}   |   Exported: ${new Date().toLocaleString()}`,
        startX + 16, cursor.y + 46, { width: pageW - 32 }
      );
    cursor.y += 68;

    // summary cards
    const cardW = (pageW - 30) / 4;
    const cardH = 48;
    [
      { label: "Users Registered",    value: users.length,        color: "#2563EB" },
      { label: "Food Posts Created",  value: foodPosts.length,    color: "#16A34A" },
      { label: "Food Requests Made",  value: foodRequests.length, color: "#D97706" },
      { label: "Ratings Given",       value: ratings.length,      color: "#7C3AED" },
    ].forEach((item, i) => {
      const cx = startX + i * (cardW + 10);
      doc.rect(cx, cursor.y, cardW, cardH).fill("#F8FAFC").stroke();
      doc.rect(cx, cursor.y, 4, cardH).fill(item.color);
      doc
        .font("Helvetica-Bold").fontSize(22).fillColor(item.color)
        .text(String(item.value), cx + 12, cursor.y + 6, { width: cardW - 16 });
      doc
        .font("Helvetica").fontSize(8).fillColor("#64748B")
        .text(item.label, cx + 12, cursor.y + 32, { width: cardW - 16 });
    });
    cursor.y += cardH + 24;

    /* ══════════════════════════════════════════
       SECTION 1 – USERS
    ══════════════════════════════════════════ */
    drawSectionTitle(doc, "Users", `${users.length} records for ${monthLabel}`, cursor);
    drawTable(doc, startX, [
      { label: "Name",           key: "name",            width: 95  },
      { label: "Email",          key: "email",           width: 135 },
      { label: "Phone",          key: "phone",           width: 75  },
      { label: "Role",           key: "role",            width: 55  },
      { label: "Address",        key: "address",         width: 90  },
      { label: "Email Verified", key: "emailVerified",   width: 65,  format: (r) => fmt.bool(r.emailVerified)   },
      { label: "Acct Verified",  key: "accountVerified", width: 65,  format: (r) => fmt.bool(r.accountVerified) },
      { label: "Rating",         key: "rating",          width: 45,  format: (r) => fmt.num(r.rating)           },
      { label: "Created At",     key: "createdAt",       width: 95,  format: (r) => fmt.date(r.createdAt)       },
    ], users, cursor);

    /* ══════════════════════════════════════════
       SECTION 2 – FOOD POSTS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Food Posts", `${foodPosts.length} records for ${monthLabel}`, cursor);
    drawTable(doc, startX, [
      { label: "Title",        key: "title",         width: 95  },
      { label: "Type",         key: "type",          width: 50  },
      { label: "Quantity",     key: "quantity",      width: 50  },
      { label: "Unit",         key: "unit",          width: 40  },
      { label: "City",         key: "city",          width: 65  },
      { label: "District",     key: "district",      width: 65  },
      { label: "Status",       key: "status",        width: 60  },
      { label: "Expiry",       key: "expiryDate",    width: 80,  format: (r) => fmt.date(r.expiryDate) },
      { label: "Donor",        key: "donor.name",    width: 85  },
      { label: "Donor Email",  key: "donor.email",   width: 110 },
      { label: "Created At",   key: "createdAt",     width: 80,  format: (r) => fmt.date(r.createdAt)  },
    ], foodPosts, cursor);

    /* ══════════════════════════════════════════
       SECTION 3 – FOOD REQUESTS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Food Requests", `${foodRequests.length} records for ${monthLabel}`, cursor);
    drawTable(doc, startX, [
      { label: "Post Title",     key: "foodPost.title",    width: 105 },
      { label: "Type",           key: "foodPost.type",     width: 50  },
      { label: "Qty",            key: "foodPost.quantity", width: 35  },
      { label: "Unit",           key: "foodPost.unit",     width: 35  },
      { label: "City",           key: "foodPost.city",     width: 60  },
      { label: "District",       key: "foodPost.district", width: 65  },
      { label: "Receiver",       key: "receiver.name",     width: 85  },
      { label: "Receiver Email", key: "receiver.email",    width: 115 },
      { label: "Status",         key: "status",            width: 60  },
      { label: "Requested At",   key: "requestedAt",       width: 80,  format: (r) => fmt.date(r.requestedAt) },
      { label: "Accepted At",    key: "acceptedAt",        width: 80,  format: (r) => fmt.date(r.acceptedAt)  },
    ], foodRequests, cursor);

    /* ══════════════════════════════════════════
       SECTION 4 – RATINGS
    ══════════════════════════════════════════ */
    doc.addPage();
    cursor.y = doc.page.margins.top;
    drawSectionTitle(doc, "Ratings", `${ratings.length} records for ${monthLabel}`, cursor);
    drawTable(doc, startX, [
      { label: "Rater",      key: "rater.name",    width: 130 },
      { label: "Receiver",   key: "receiver.name", width: 130 },
      { label: "Rating",     key: "rating",        width: 60,  format: (r) => fmt.num(r.rating) },
      { label: "Comment",    key: "comment",       width: 310 },
      { label: "Created At", key: "createdAt",     width: 100, format: (r) => fmt.date(r.createdAt) },
    ], ratings, cursor);

    /* ── Page numbers ───────────────────────────────────────── */
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica").fontSize(7).fillColor("#94A3B8")
        .text(
          `${monthLabel}  •  Page ${i + 1} of ${totalPages}`,
          doc.page.margins.left,
          doc.page.height - doc.page.margins.bottom + 8,
          { align: "right", width: pageW }
        );
    }

    doc.end();
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};
// get the list of food post for dashboard
export const getListFoodPost = async (req, res) => {
  try {
    const foodPosts = await foodPostModel
      .find()
      .populate("donor")
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
// get the list of food post with request deatils and donor details and pagination , get all details to show in food post pages
export const getFoodPostWithPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { district: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Count total matching documents
    const total = await foodPostModel.countDocuments(query);

    // Fetch paginated food posts
    const foodPosts = await foodPostModel
      .find(query)
      .populate("donor")
      .populate({
        path: "requests",
        populate: { path: "receiver" },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const pagination = getPagination(page, limit, total);

    return sendResponse(res, {
      status: 200,
      data: {
        foodPosts,
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


// get the food post with request deatils and donor details by id
// it think this is not required
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
//  get the donations over time for dashboard
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
// get the food type distribution for dashboard
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

// Request Status Overview for dashboard
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

// delete the food post by admin
export const deleteFoodPost = async (req, res) => {
  try {
    const foodId = req.params.id;

    // 1. Check if post exists
    const foodPost = await foodPostModel.findById(foodId);
    if (!foodPost) {
      return sendResponse(res, {
        status: 404,
        message: "Food post not found",
      });
    }

    // 2. Delete all requests related to this post
    await foodRequestModel.deleteMany({ foodPost: foodId });

    // 3. Delete the food post itself
    await foodPostModel.findByIdAndDelete(foodId);

    return sendResponse(res, {
      status: 200,
      message: "Food post and related requests deleted successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};