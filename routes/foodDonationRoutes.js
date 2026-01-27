import express from "express";
import {
  createFoodDonation,
  getAllFoodDonations,
  getMyDonations,
  acceptFoodRequest,
  rejectedFoodRequest,
  getFoodLocations,
  requestFood,
  getFoodById,
  deleteFoodDonation,
  updateFoodDonation,getFoodRequestDetails,getListFoodRequests,cancelFoodRequest,getMyFoodRequestsList
} from "../controllers/foodDonationsController.js";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
// Routes
// Create food donation
router.post("/",protect, upload.fields([{ name: "photo" }]), createFoodDonation);
// Get all food donations posted
router.get("/", getAllFoodDonations);
// Get my donations
router.get("/my",protect, getMyDonations);
// Request food donation by requester
router.post("/request",protect, requestFood);
// Accept food request
router.post("/accept",protect, acceptFoodRequest);
// Complete food request
// Get food locations
router.get("/:foodPostId/locations",protect, getFoodLocations);
// Reject food request
router.post("/reject",protect, rejectedFoodRequest);
// Get food post  by id
router.get("/:id",protect, getFoodById);
// Delete food donation
router.delete("/:id",protect, deleteFoodDonation);
// Update food donation
router.put("/:id",protect, upload.fields([{ name: "photo" }]), updateFoodDonation);
// Get food requests details for a food post and donor
router.get("/:id/requests-details",protect, getFoodRequestDetails);
// Get all food requests for admins
router.get("/requests/list",protect, getListFoodRequests);
// Get my food requests
router.get("/my/requests",protect, getMyFoodRequestsList);
// Cancel food request
router.post("/request/cancel",protect, cancelFoodRequest);



export default router;
