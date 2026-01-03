// controllers/ratingController.js
import Rating from "../models/RatingModel.js";
import { sendResponse } from "../utils/responseHandler.js";

// Create or update rating
export const rateUser = async (req, res) => {
  try {
    const { receiverId, rating, comment } = req.body;

    if (!req.session.userId) {
      return sendResponse(res, { status: 401, message: "Not logged in" });
    }

    // Check if this user already rated this receiver for this item
    let existingRating = await Rating.findOne({
      rater: req.session.userId,
      receiver: receiverId,
    });

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.comment = comment || existingRating.comment;
      await existingRating.save();
      return sendResponse(res, { message: "Rating updated", data: existingRating });
    }

    const newRating = await Rating.create({
      rater: req.session.userId,
      receiver: receiverId,
      rating,
      comment,
    });
    await createNotification(receiverId, "You have a new rating");
    await logActivity("Rating Created", req.session.userId);


    if (newRating) {
      await createNotification(receiverId, "You have a new rating");
      await logActivity("Rating Created", req.session.userId);
    }

    return sendResponse(res, { message: "Rating submitted", data: newRating });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

// Get all ratings received by a user
export const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    const ratings = await Rating.find({ receiver: userId })
      .populate("rater", "name email")
      .populate("item", "title description"); // optional

    const avgRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / (ratings.length || 1);

    return sendResponse(res, {
      message: "Ratings fetched",
      data: { ratings, average: avgRating.toFixed(2) },
    });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

// Get all ratings for an item
// export const getItemRatings = async (req, res) => {
//   try {
//     const { itemId } = req.params;

//     const ratings = await Rating.find({ item: itemId })
//       .populate("rater", "name email")
//       .populate("receiver", "name email");

//     const avgRating =
//       ratings.reduce((sum, r) => sum + r.rating, 0) / (ratings.length || 1);

//     return sendResponse(res, {
//       message: "Item ratings fetched",
//       data: { ratings, average: avgRating.toFixed(2) },
//     });
//   } catch (error) {
//     return sendResponse(res, { status: 500, message: error.message });
//   }
// };

// Delete your own rating
// export const deleteRating = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.session.userId) {
//       return sendResponse(res, { status: 401, message: "Not logged in" });
//     }

//     const rating = await Rating.findOneAndDelete({
//       _id: id,
//       rater: req.session.userId,
//     });

//     if (!rating) {
//       return sendResponse(res, { status: 404, message: "Rating not found" });
//     }

//     return sendResponse(res, { message: "Rating deleted" });
//   } catch (error) {
//     return sendResponse(res, { status: 500, message: error.message });
//   }
// };
