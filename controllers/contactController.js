import ContactMessage from "../models/ContactMessage.js";
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
    const messages = await ContactMessage.find();
    return sendResponse(res, {
      status: 200,
      data: messages,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};