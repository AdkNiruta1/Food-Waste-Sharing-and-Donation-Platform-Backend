import express from "express";
import {
  getAllUsers,
  getUserById,
  verifyUser,
  rejectUser,
  deleteUser,
  getAdminStats,
  exportUsersCSV,
  exportFullAppReport,
  exportFullAppReportForMonth,
  getFoodPost,
  getListFoodPost
} from "../controllers/adminController.js";
import { adminRoutes, protect } from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/users", adminRoutes, getAllUsers);
router.get("/users/:id", protect, getUserById);

router.put("/verify-user/:id", adminRoutes, verifyUser);
router.put("/reject-user/:id", adminRoutes, rejectUser);
router.delete("/delete-user/:id", adminRoutes, deleteUser);

router.get("/stats", adminRoutes, getAdminStats);
router.get("/export/users", adminRoutes, exportUsersCSV);
router.get("/export/full-report", adminRoutes, exportFullAppReport);
router.get("/export/full-report/:month/:year", adminRoutes, exportFullAppReportForMonth);

router.get("/food-post/:id", adminRoutes, getFoodPost);
router.get("/food-post/list", adminRoutes, getListFoodPost);

export default router;
