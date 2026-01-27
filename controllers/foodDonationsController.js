import FoodPost from "../models/foodPostModel.js";
import { sendResponse } from "../utils/responseHandler.js"; // your custom helper
import { saveCompressedImage } from "../utils/saveImage.js";
import { logActivity } from "../utils/logger.js";
import FoodRequest from "../models/foodRequestModel.js";
import mongoose from "mongoose";
// Create a new food donation
export const createFoodDonation = async (req, res) => {
  try {
    // Check if the user is logged in
    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }
    // Get the form data
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
    // Validate input
    const docs = req.files || {};
    if (!docs.photo) {
      return sendResponse(res, { status: 400, message: "No file uploaded" });
    }
    // Compress & save uploaded file
    const file = docs.photo[0];
    const folder = "uploads/food";
    const filename = `${Date.now()}-food.jpg`;
    // normalize path for frontend
    const savedPath = await saveCompressedImage(file.buffer, folder, filename);
    const photo = savedPath.replace(/\\/g, "/")
    // Create a new food donation;
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
    // Save food donation
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

// Get all food donations posted for users which are available
export const getAllFoodDonations = async (req, res) => {
  try {
    // Get pagination parameters
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
    // Send response
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


// Get donations list by donor
export const getMyDonations = async (req, res) => {
  try {
    // 1️ Auth check
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }
    // 2️ Fetch all food posts of current donor
    const donations = await FoodPost.find({
      donor: req.session.userId,
      status: "available",
    })
      .sort({ createdAt: -1 });
    // 3️ Send response
    return sendResponse(res, {
      status: 200,
      message: "Food donations fetched successfully",
      data: donations,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

//reciver send request food to food onwers
export const requestFood = async (req, res) => {
  try {
    // Auth check
    if (!req.session.userId) return sendResponse(res, { status: 401, message: "Not logged in" });
    // Find food post
    const { foodPostId } = req.body;
    const foodPost = await FoodPost.findById(foodPostId);
    if (!foodPost) return sendResponse(res, { status: 404, message: "Food post not found" });
    // Check if food post is available
    if (foodPost.status !== "available") return sendResponse(res, { status: 400, message: "Food not available" });
    // Check if food post is expired
    const request = await FoodRequest.create({
      foodPost: foodPostId,
      receiver: req.session.userId,
    });
    // Send response
    await logActivity("Food Request Created", req.session.userId);
    return sendResponse(res, { status: 201, message: "Request sent", data: request });

  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

//accept food request by donor
export const acceptFoodRequest = async (req, res) => {
  try {
    // get id from body
    const { requestId } = req.body;
    // find request
    const request = await FoodRequest
      .findById(requestId)
      .populate("foodPost");
    // not found
    if (!request) {
      return sendResponse(res, {
        status: 404,
        message: "Request not found",
      });
    }

    // 🔐 Only donor can accept
    if (request.foodPost.donor.toString() !== req.session.userId) {
      return sendResponse(res, {
        status: 403,
        message: "Access denied",
      });
    }

    // 🛑 If already accepted
    if (request.status === "accepted") {
      return sendResponse(res, {
        status: 400,
        message: "Request already accepted",
      });
    }

    /* ---------------- ACCEPT SELECTED REQUEST ---------------- */
    request.status = "accepted";
    request.acceptedAt = new Date();
    await request.save();

    /* ---------------- REJECT ALL OTHER REQUESTS ---------------- */
    await FoodRequest.updateMany(
      {
        foodPost: request.foodPost._id,
        _id: { $ne: request._id },
      },
      {
        status: "rejected",
        rejectedAt: new Date(),
      }
    );

    /* ---------------- UPDATE FOOD POST ---------------- */
    request.foodPost.status = "accepted"; // or "reserved"
    request.foodPost.acceptedRequest = request._id;
    await request.foodPost.save();

    /* ---------------- ACTIVITY LOGS ---------------- */
    await logActivity(
      "Food Request Accepted",
      req.session.userId
    );
    // log ativity
    await logActivity(
      "Your food request was accepted",
      request.receiver
    );
    // Send response
    return sendResponse(res, {
      status: 200,
      message: "Request accepted successfully",
      data: request,
    });

  } catch (err) {
    return sendResponse(res, {
      status: 500,
      message: err.message,
    });
  }
};

//reject food request by donor
export const rejectedFoodRequest = async (req, res) => {
  try {
    // get id from body
    const { requestId } = req.body;
    const request = await FoodRequest.findById(requestId).populate("foodPost");
    // not found
    if (!request) return sendResponse(res, { status: 404, message: "Request not found" });
    // save request as rejected
    request.status = "rejected";
    request.rejectedAt = new Date();
    // save
    await request.save();
    // update food post
    request.foodPost.status = "available";
    await request.foodPost.save();
    // log activity
    await logActivity("your food request has been rejected", request.receiver);
    await logActivity("Food Request Rejected", req.session.userId);
    // send response
    return sendResponse(res, { status: 200, message: "Request rejected", data: request });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

// Get food locations
// i think this is not required
export const getFoodLocations = async (req, res) => {
  try {
    // Get id from params
    const { foodPostId } = req.params;
    // Find food post
    const foodPost = await FoodPost.findById(foodPostId).populate("acceptedRequest");
    if (!foodPost) return sendResponse(res, { status: 404, message: "Food post not found" });
    // Get locations
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
// Get food donation details by ID with all requests details
export const getFoodById = async (req, res) => {
  try {
    const food = await FoodPost.findById(req.params.id)
      .populate("donor")
      .lean(); 

    if (!food) {
      return sendResponse(res, {
        status: 404,
        message: "Food not found",
      });
    }

    // Fetch all requests for this food
    const requests = await FoodRequest.find({
      foodPost: food._id,
    })
      .populate("receiver")
      .sort({ createdAt: -1 });

    // Attach requests to food
    food.requests = requests;

    return sendResponse(res, {
      status: 200,
      data: food,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// delete food donation by food owners
export const deleteFoodDonation = async (req, res) => {
  try {
    const foodId = req.params.id;
    const foodPost = await FoodPost.findById(foodId);
    if (!foodPost) {
      return sendResponse(res, {
        status: 404,
        message: "Food donation not found",
      });
    }
    await FoodPost.findByIdAndDelete(foodId);
    await logActivity("Food Donation Deleted", req.session.userId);
    return sendResponse(res, {
      message: "Food donation deleted successfully",
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// Update food donation by food owners
export const updateFoodDonation = async (req, res) => {
  try {
    const foodId = req.params.id;
    const foodPost = await FoodPost.findById(foodId);
    if (!foodPost) {
      return sendResponse(res, {
        status: 404,
        message: "Food donation not found",
      });
    }

    const updatedFoodPost = await FoodPost.findByIdAndUpdate(
      foodId,
      req.body,
      { new: true }
    );
    await logActivity("Food Donation Updated", req.session.userId);
    return sendResponse(res, {
      message: "Food donation updated successfully",
      data: updatedFoodPost,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
// Get food requests for a specific food post by receiver to get details
export const getFoodRequestDetails = async (req, res) => {
  try {
    const receiverId = req.session.userId;
    if (!receiverId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    const { id: requestId } = req.params; // this is the FoodRequest _id
    if (!requestId) {
      return sendResponse(res, { status: 400, message: "Food request ID is required" });
    }

    // Find the specific food request by its ID
    const request = await FoodRequest.findById(requestId)
      .populate({
        path: "foodPost",
        populate: {
          path: "donor",
        }
      }).populate("receiver");

    if (!request) {
      return sendResponse(res, { status: 404, message: "Food request not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return sendResponse(res, { status: 400, message: "Invalid receiver ID" });
    }

    // Convert the string to ObjectId using `new`
    if (!request.receiver.equals(new mongoose.Types.ObjectId(receiverId))) {
      return sendResponse(res, { status: 403, message: "Access denied" });
    }


    return sendResponse(res, { status: 200, data: request });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

// Get all food requests
// it think this is not required
export const getListFoodRequests = async (req, res) => {
  try {
    const requests = await FoodRequest.find()
      .populate({
        path: "receiver", path: "foodPost",
        populate: {
          path: "donor",
        },
      })
      .sort({ createdAt: -1 });
    return sendResponse(res, { status: 200, data: requests });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};

// get my food requests by receiver
export const getMyFoodRequestsList = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }

    const requests = await FoodRequest.find({
      receiver: req.session.userId,
    })
      .populate({
        path: "foodPost",
        populate: {
          path: "donor",
        },
      })
      .populate("receiver")
      .sort({ createdAt: -1 });

    return sendResponse(res, {
      status: 200,
      message: "Food requests fetched successfully",
      data: requests,
    });
  } catch (err) {
    return sendResponse(res, {
      status: 500,
      message: err.message,
    });
  }
};

// cancelled request by receiver to food post
export const cancelFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FoodRequest.findById(requestId).populate("foodPost");
    if (!request) return sendResponse(res, { status: 404, message: "Request not found" });
    request.status = "cancelled";
    await request.save();
    // request.foodPost.status = "available";
    // await request.foodPost.save();
    await logActivity("your food request has been cancelled", request.receiver);
    await logActivity("Food Request Cancelled", req.session.userId);
    return sendResponse(res, { status: 200, message: "Request cancelled", data: request });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};