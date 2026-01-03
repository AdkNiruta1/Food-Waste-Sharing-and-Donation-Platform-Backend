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
  getMyActiveDonations
} from "../controllers/foodDonationsController.js";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
// Routes
router.post("/",protect, upload.fields([{ name: "photo" }]), createFoodDonation);
router.get("/", getAllFoodDonations);
router.get("/history",protect, getMyDonations);
router.get("/my",protect, getMyActiveDonations);

router.post("/request",protect, requestFood);
router.post("/accept",protect, acceptFoodRequest);
router.post("/complete",protect, completeFoodRequest);
router.get("/:foodPostId/locations",protect, getFoodLocations);
router.post("/reject",protect, rejectedFoodRequest);
router.get("/:id",protect, getFoodById);


export default router;
