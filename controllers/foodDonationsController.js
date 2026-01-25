import FoodPost from "../models/foodPostModel.js";
import { sendResponse } from "../utils/responseHandler.js"; // your custom helper
import { saveCompressedImage } from "../utils/saveImage.js";
import { logActivity } from "../utils/logger.js";
import FoodRequest from "../models/foodRequestModel.js";
import { createNotification } from "./notificationController.js";
import mongoose from "mongoose";
import Rating from "../models/RatingModel.js";
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


// Get donations history by donor with rating and accepted request

export const getMyDonationsHistory = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    // 1️⃣ Fetch all food posts of current donor
    const foodPosts = await FoodPost.find({ donor: req.session.userId })
      .populate({
        path: "acceptedRequest",       // Only the accepted request
        populate: { path: "receiver" } // Populate receiver inside acceptedRequest
      })
      .sort({ updatedAt: -1 });

    // 2️⃣ For each food post, add rating given by the accepted receiver
    const enriched = await Promise.all(
      foodPosts.map(async (post) => {
        const acceptedRequest = post.acceptedRequest;

        let ratingDoc = null;
        if (acceptedRequest?.receiver) {
          ratingDoc = await Rating.findOne({
            rater: acceptedRequest.receiver._id, // who gave rating
            receiver: req.session.userId         // current donor
          });
        }

        return {
          ...post.toObject(),
          acceptedRequest: acceptedRequest ? acceptedRequest.toObject() : null,
          rating: ratingDoc
            ? { value: ratingDoc.rating, comment: ratingDoc.comment }
            : null
        };
      })
    );

    return sendResponse(res, {
      status: 200,
      data: enriched
    });

  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message
    });
  }
};

// get donations history details by donor by id

export const getMyDonationsHistoryById = async (req, res) => {
  try {
    // 1️⃣ Auth check
    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    // 2️⃣ Fetch all food posts of current donor
    const { foodPostId } = req.params;

    // 1️⃣ Fetch all food posts of current donor
    const foodPosts = await FoodPost.find({ _id: foodPostId, donor: req.session.userId })
      .populate({
        path: "acceptedRequest",       // Only the accepted request
        populate: { path: "receiver" } // Populate receiver inside acceptedRequest
      })
      .sort({ updatedAt: -1 });

    // 2️⃣ For each food post, add rating given by the accepted receiver
    const enriched = await Promise.all(
      foodPosts.map(async (post) => {
        const acceptedRequest = post.acceptedRequest;

        let ratingDoc = null;
        if (acceptedRequest?.receiver) {
          ratingDoc = await Rating.findOne({
            rater: acceptedRequest.receiver._id, // who gave rating
            receiver: req.session.userId         // current donor
          });
        }

        return {
          ...post.toObject(),
          acceptedRequest: acceptedRequest ? acceptedRequest.toObject() : null,
          rating: ratingDoc
            ? { value: ratingDoc.rating, comment: ratingDoc.comment }
            : null
        };
      })
    );

    return sendResponse(res, {
      status: 200,
      data: enriched
    });

  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message
    });
  }
};


// Get donations by donor with status accepted
export const getMyActiveDonations = async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    const activeRequests = await FoodRequest.find({
      status: "accepted",
    })
      .populate({
        path: "foodPost",
        match: { donor: req.session.userId },
      })
      .populate("receiver")
      .sort({ updatedAt: -1 });

    // remove null foodPosts (not belonging to this donor)
    const filtered = activeRequests.filter(r => r.foodPost);

    return sendResponse(res, {
      status: 200,
      data: filtered,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};

// get my active donations by donor by id
export const getMyActiveDonationById = async (req, res) => {
  try {
    // 1️⃣ Auth check
    if (!req.session.userId) {
      return sendResponse(res, {
        status: 401,
        message: "Not logged in",
      });
    }

    const { requestId } = req.params;

    // 2️⃣ Find accepted request by ID
    const request = await FoodRequest.findOne({
      _id: requestId,
      status: "accepted",
    })
      .populate({
        path: "foodPost",
        match: { donor: req.session.userId }, // 🔐 donor-only access
      })
      .populate("receiver");

    // 3️⃣ Not found or not owned by donor
    if (!request || !request.foodPost) {
      return sendResponse(res, {
        status: 404,
        message: "Request not found or unauthorized",
      });
    }

    // 4️⃣ Success
    return sendResponse(res, {
      status: 200,
      data: request,
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};


// Get donations list by donor
export const getMyDonations = async (req, res) => {
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

//accept food request by donor
export const acceptFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FoodRequest
      .findById(requestId)
      .populate("foodPost");

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

    /* ---------------- NOTIFICATIONS ---------------- */
    await createNotification(
      request.receiver,
      "Your food request has been accepted 🎉"
    );

    await createNotification(
      request.foodPost.donor,
      "You accepted a food request"
    );

    /* ---------------- ACTIVITY LOGS ---------------- */
    await logActivity(
      "Food Request Accepted",
      req.session.userId
    );

    await logActivity(
      "Your food request was accepted",
      request.receiver
    );

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


//complete food request by donor
export const completeFoodRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FoodRequest
      .findById(requestId)
      .populate("foodPost");

    if (!request) {
      return sendResponse(res, {
        status: 404,
        message: "Request not found",
      });
    }

    /* ❌ Only accepted request can be completed */
    if (request.status !== "accepted") {
      return sendResponse(res, {
        status: 400,
        message: "Only accepted requests can be completed",
      });
    }

    /* ❌ Prevent double completion */
    if (request.foodPost.status === "completed") {
      return sendResponse(res, {
        status: 400,
        message: "Food already completed",
      });
    }

    /* ✅ COMPLETE REQUEST */
    request.status = "completed";
    request.completedAt = new Date();
    await request.save();

    /* 🍲 UPDATE FOOD POST */
    request.foodPost.status = "completed";
    await request.foodPost.save();

    /* 🔔 NOTIFICATIONS */
    await createNotification(
      request.receiver,
      "Your food request has been completed 🍲"
    );

    /* 🧾 ACTIVITY LOGS */
    await logActivity(
      "Food Request Completed",
      req.session.userId
    );

    await logActivity(
      "Your food request was completed",
      request.receiver
    );

    return sendResponse(res, {
      status: 200,
      message: "Food delivery completed successfully",
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
// update the status of food post to expired
export const expireFoodPost = async (req, res) => {
  try {
    const { foodPostId } = req.params;
    const foodPost = await FoodPost.findById(foodPostId);
    if (!foodPost) return sendResponse(res, { status: 404, message: "Food post not found" });
    if (foodPost.status === "expired") return sendResponse(res, { status: 400, message: "Food post already expired" });
    foodPost.status = "expired";
    await foodPost.save();
    return sendResponse(res, { status: 200, message: "Food post expired", data: foodPost });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
}

// Get food locations
// i think this is not required
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
    await createNotification(request.receiver, "Your food request has been cancelled");
    await logActivity("your food request has been cancelled", request.receiver);
    await logActivity("Food Request Cancelled", req.session.userId);
    return sendResponse(res, { status: 200, message: "Request cancelled", data: request });
  } catch (err) {
    return sendResponse(res, { status: 500, message: err.message });
  }
};