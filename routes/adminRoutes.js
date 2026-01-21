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
  getListFoodPost,
  getDonationsOverTime,
  getFoodTypeDistribution,
  getRequestStatusOverview,
  getFoodPostWithPagination,
  deleteFoodPost
} from "../controllers/adminController.js";
import { adminRoutes, protect } from "../middleware/authMiddleware.js";


const router = express.Router();
// get all users
router.get("/users", adminRoutes, getAllUsers);
// get user by id
router.get("/users/:id", protect, getUserById);
// verify user
router.put("/verify-user/:id", adminRoutes, verifyUser);
// reject user
router.put("/reject-user/:id", adminRoutes, rejectUser);
// delete user
router.delete("/delete-user/:id", adminRoutes, deleteUser);
// get admin stats
router.get("/stats", adminRoutes, getAdminStats);
// export users
router.get("/export/users", adminRoutes, exportUsersCSV);
// export full app report
router.get("/export/full-report", adminRoutes, exportFullAppReport);
// export full app report
router.get("/export/full-report/:month/:year", adminRoutes, exportFullAppReportForMonth);
// get food post by id
router.get("/food-post/:id/details", adminRoutes, getFoodPost);
// get list of food posts
router.get("/food-post/list", adminRoutes, getListFoodPost);
// get donations over time
router.get("/donations-over-time", adminRoutes, getDonationsOverTime);
// get food type distribution
router.get("/food-type-distribution", adminRoutes, getFoodTypeDistribution);
// get request status overview
router.get("/request-status-overview", adminRoutes, getRequestStatusOverview);
// get food post with pagination
router.get("/food-post", adminRoutes, getFoodPostWithPagination);
// delete food post
router.delete("/food-post/:id", adminRoutes, deleteFoodPost);
export default router;
