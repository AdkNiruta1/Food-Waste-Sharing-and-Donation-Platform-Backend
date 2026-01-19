import express from "express";
import { submitContactForm,getContactMessages } from "../controllers/contactController.js";

const router = express.Router();

router.post("/", submitContactForm);
router.get("/", getContactMessages);  
export default router;
