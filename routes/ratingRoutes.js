import express from "express";
import {
  rateUser,
  getUserRatings,
} from "../controllers/ratingController.js";

const router = express.Router();
// Routes
router.post("/rate", rateUser); // Create or update a rating
router.get("/user/:userId", getUserRatings); // Get ratings received by a user
export default router;
