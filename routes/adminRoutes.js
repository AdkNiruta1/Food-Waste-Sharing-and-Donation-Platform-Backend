import express from "express";
import {
  getAllUsers,
  getUserById,
  verifyUser,
  rejectUser,
  deleteUser,
  getAdminStats,
  exportUsersCSV,
} from "../controllers/adminController.js";
import { adminRoutes } from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/users", adminRoutes, getAllUsers);
router.get("/users/:id", adminRoutes, getUserById);

router.put("/verify-user/:id", adminRoutes, verifyUser);
router.put("/reject-user/:id", adminRoutes, rejectUser);
router.delete("/delete-user/:id", adminRoutes, deleteUser);

router.get("/stats", adminRoutes, getAdminStats);
router.get("/export/users", adminRoutes, exportUsersCSV);

export default router;
