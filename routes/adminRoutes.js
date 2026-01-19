import express from "express";
import {
  getAllUsers,
  getUserById,
  verifyUser,
  rejectUser,
  deleteUser,
  getAdminStats,
  exportUsersCSV,
  exportFullAppReport
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

export default router;
