import ContactMessage from "../models/ContactMessage.js";
import { getPagination } from "../utils/pagination.js";
import {sendResponse} from "../utils/responseHandler.js";

export const submitContactForm = async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
      inquiryType,
      subscribe,
    } = req.body;

    // Basic validation (backend safety)
    if (!name || !email || !subject || !message) {
      return sendResponse(res, {
        status: 400,
        message: "All required fields must be filled",
      });
    }

    if (message.length < 10) {
      return sendResponse(res, {
        status: 400,
        message: "Message must be at least 10 characters",
      });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      inquiryType,
      subscribe,
    });

    return sendResponse(res, {
      status: 201,
      message: "Your message has been sent successfully",
      data: contact,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

export const getContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    // Build search query if needed
    const query = search
      ? { message: { $regex: search, $options: "i" } } // case-insensitive search in message field
      : {};

    const total = await ContactMessage.countDocuments(query);

    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);
    const pagination = getPagination(page, limit, total, totalPages);
    return sendResponse(res, {
      status: 200,
      data: {
        messages,
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
