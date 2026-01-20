import express from "express";
import { submitContactForm,getContactMessages,markMessageRead,deleteMessage } from "../controllers/contactController.js";

const router = express.Router();
// Routes for contacts
// Submit contact form
router.post("/", submitContactForm);
// Get all contact messages
router.get("/", getContactMessages); 
// Mark message as read
router.put("/:id/read", markMessageRead);
// Delete message 
router.delete("/:id", deleteMessage);
export default router;
