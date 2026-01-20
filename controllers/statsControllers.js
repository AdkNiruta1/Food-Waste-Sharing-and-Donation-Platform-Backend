import FoodRequest from "../models/FoodRequest.js";
import Rating from "../models/RatingModel.js";
import sendResponse from "../utils/responseHandler.js";


//i think not used later i used 
export const getReceiverStats = async (req, res) => {
  try {
    const receiverId = req.session.userId;

    // Active requests (pending + accepted)
    const activeRequests = await FoodRequest.countDocuments({
      receiver: receiverId,
      status: { $in: ["pending", "accepted"] },
    });

    // Completed pickups
    const completedPickups = await FoodRequest.countDocuments({
      receiver: receiverId,
      status: "completed",
    });

    // Total requests
    const totalRequests = await FoodRequest.countDocuments({
      receiver: receiverId,
    });

    // Ratings received by receiver
    const ratings = await Rating.find({ receiver: receiverId });

    const averageRating =
      ratings.length > 0
        ? (
            ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          ).toFixed(1)
        : 0;

    return sendResponse(res, {
      status: 200,
      data: {
        activeRequests,
        completedPickups,
        totalRequests,
        averageRating,
        ratingCount: ratings.length,
      },
    });
  } catch (error) {
    return sendResponse(res, {
      status: 500,
      message: error.message,
    });
  }
};
