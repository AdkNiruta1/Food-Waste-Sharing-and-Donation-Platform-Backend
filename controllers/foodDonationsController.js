import FoodPost from "../models/foodPostModel.js";
import { sendResponse } from "../utils/responseHandler.js"; // your custom helper
import { saveCompressedImage } from "../utils/saveImage.js";
import {  logActivity } from "../utils/logger.js";
import FoodRequest from "../models/foodRequestModel.js";
import {  createNotification,  sendNotificationAll } from "./notificationController.js";

// Create a new food donation
export const createFoodDonation = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    const {
      title,
      description,
      type,
      quantity,
      unit,
      expiryDate,
      district,
      city,
      lat,
      lng,
      pickupInstructions,
    } = req.body;

    const docs = req.files || {};
    if (!docs.photo) {
      return sendResponse(res, { status: 400, message: "No file uploaded" });
    }

    const file = docs.photo[0];
    const folder = "uploads/food";
    const filename = `${Date.now()}-food.jpg`;

    const savedPath = await saveCompressedImage(file.buffer, folder, filename);
    const photo = savedPath.replace(/\\/g, "/");
    const donation = await FoodPost.create({
      donor: req.session.userId,
      title,
      description,
      type,
      quantity,
      unit,
      expiryDate,
      district,
      city,
      lat,
      lng,
      pickupInstructions,
      photo,
    });
    await createNotification(donation.donor, "Your food donation has been created successfully");
    await sendNotificationAll("A new food donation has been created you can pick it up");
    await logActivity("Food Donation Created", req.session.userId);
    return sendResponse(res, {
      status: 201,
      message: "Food donation created successfully",
      data: donation,
    });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

// Get all food donations
export const getAllFoodDonations = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch paginated donations
    const donations = await FoodPost.find({ status: "available" })
      .populate("donor") // populate all donor fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count total documents
    const total = await FoodPost.countDocuments({ status: "available" });

    return sendResponse(res, {
      status: 200,
      message: "Food donations fetched successfully",
      data: {
        donations,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    return sendResponse(res, {
      status: 500,
      message: err.message,
    });
  }
};


// Get donations by donor
export const getMyDonations = async (req, res) => {
  try {
    if (!req.session.userId) return sendResponse(res, { status: 401, message: "Not logged in" });

    const donations = await FoodPost.find({ donor: req.session.userId });
    return sendResponse(res, { status: 200, data: donations });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

export const getMyActiveDonations = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }

    const donations = await FoodPost.find({
      donor: req.session.userId,
      status: "available", 
    })
      .sort({ createdAt: -1 });

    return sendResponse(res, {
      status: 200,
      message: "Active donations fetched successfully",
      data: donations,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

//reciver request food
export const requestFood = async (req, res) => {
  try {
    if (!req.session.userId) return sendResponse(res, { status: 401, message: "Not logged in" });

    const { foodPostId } = req.body;
    const foodPost = await FoodPost.findById(foodPostId);
    if (!foodPost) return sendResponse(res, { status: 404, message: "Food post not found" });
    if (foodPost.status !== "available") return sendResponse(res, { status: 400, message: "Food not available" });

    const request = await FoodRequest.create({
      foodPost: foodPostId,
      receiver: req.session.userId,
    });

    await createNotification(foodPost.donor, "You have a new food request");
    await logActivity("Food Request Created", req.session.userId);
    return sendResponse(res, { status: 201, message: "Request sent", data: request });

  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

//accept food request
export const acceptFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FoodRequest.findById(requestId).populate("foodPost");
    if (!request) return sendResponse(res, { status: 404, message: "Request not found" });
    request.status = "accepted";
    request.acceptedAt = new Date();
    await request.save();

    request.foodPost.status = "accepted";
    request.foodPost.acceptedRequest = request._id;
    await request.foodPost.save();
    await createNotification(request.receiver, "Your food request has been accepted");
    await logActivity("your food request has been accepted", request.receiver);
    await logActivity("Food Request Accepted", req.session.userId);

    return sendResponse(res, { status: 200, message: "Request accepted", data: request });

  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

//complete food request
export const completeFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FoodRequest.findById(requestId).populate("foodPost");
    if (!request) return sendResponse(res, { status: 404, message: "Request not found" });
    request.status = "completed";
    request.completedAt = new Date();
    await request.save();

    request.foodPost.status = "completed";
    await request.foodPost.save();
    await createNotification(request.receiver, "Your food request has been completed");
    await logActivity("your food request has been completed", request.receiver);
    await logActivity("Food Request Completed", req.session.userId);
    return sendResponse(res, { status: 200, message: "Food delivery completed", data: request });

  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

export const rejectedFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FoodRequest.findById(requestId).populate("foodPost");
    if (!request) return sendResponse(res, { status: 404, message: "Request not found" });

    request.status = "rejected";
    request.rejectedAt = new Date();
    await request.save();

    request.foodPost.status = "available";
    await request.foodPost.save();
    await createNotification(request.receiver, "Your food request has been rejected");
    await logActivity("your food request has been rejected", request.receiver);
    await logActivity("Food Request Rejected", req.session.userId);
    return sendResponse(res, { status: 200, message: "Request rejected", data: request });  
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

// Get food locations
export const getFoodLocations = async (req, res) => {
  try {
    const { foodPostId } = req.params;
    const foodPost = await FoodPost.findById(foodPostId).populate("acceptedRequest");
    if (!foodPost) return sendResponse(res, { status: 404, message: "Food post not found" });

    let receiverLocation = null;
    if (foodPost.acceptedRequest) {
      const receiver = await User.findById(foodPost.acceptedRequest.receiver);
      receiverLocation = receiver.geoLocation;
    }

    return sendResponse(res, {
      status: 200,
      data: {
        donorLocation: foodPost.geoLocation,
        receiverLocation,
      }
    });

  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};
// GET /api/food/:id
export const getFoodById = async (req, res) => {
  try {
    const food = await FoodPost.findById(req.params.id)
      .populate("donor");

    if (!food) {
      return sendResponse(res, {
        status: 404,
        message: "Food not found",
      });
    }

    return sendResponse(res, {
      data: food,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
