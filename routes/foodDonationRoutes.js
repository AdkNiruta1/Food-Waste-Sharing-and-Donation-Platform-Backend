import express from "express";
import {
  createFoodDonation,
  getAllFoodDonations,
  getMyDonations,
  acceptFoodRequest,
  completeFoodRequest,
  rejectedFoodRequest,
  getFoodLocations,
  requestFood,
  getFoodById,
  getMyActiveDonations,
  getMyDonationsHistory,
  deleteFoodDonation,
  updateFoodDonation,getFoodRequestsDetails,getListFoodRequests,cancelFoodRequest,getMyFoodRequestsList
} from "../controllers/foodDonationsController.js";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
// Routes
router.post("/",protect, upload.fields([{ name: "photo" }]), createFoodDonation);
router.get("/", getAllFoodDonations);
router.get("/history",protect, getMyDonationsHistory);
router.get("/my",protect, getMyDonations);
router.get("/active",protect, getMyActiveDonations);
router.post("/request",protect, requestFood);
router.post("/accept",protect, acceptFoodRequest);
router.post("/complete",protect, completeFoodRequest);
router.get("/:foodPostId/locations",protect, getFoodLocations);
router.post("/reject",protect, rejectedFoodRequest);
router.get("/:id",protect, getFoodById);
router.delete("/:id",protect, deleteFoodDonation);
router.put("/:id",protect, upload.fields([{ name: "photo" }]), updateFoodDonation);
router.get("/:id/requests-details",protect, getFoodRequestsDetails);
router.get("/requests/list",protect, getListFoodRequests);
router.get("/my/requests",protect, getMyFoodRequestsList);
router.post("/request/cancel",protect, cancelFoodRequest);

export default router;
