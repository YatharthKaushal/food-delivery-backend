import express from "express";
import {
  getIsProfileComplete,
  onBoardingUser,
  createTestCustomer,
} from "./customer.auth.controller.js";
import { verifyFirebaseToken } from "../middleware/firebaseToken.middleware.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/auth/customer/status
 * @desc    Get customer profile completion status
 * @access  Protected (Firebase Token Required)
 */
router.get("/status", verifyFirebaseToken, getIsProfileComplete);

/**
 * @route   PUT /api/auth/customer/onboarding
 * @desc    Complete customer onboarding by updating profile
 * @access  Protected (Firebase Token Required)
 */
router.put("/onboarding", verifyFirebaseToken, onBoardingUser);

/**
 * @route   POST /api/auth/customer/test
 * @desc    Create a test customer for development/testing purposes
 * @access  Protected (Admin Only - JWT Required)
 */
router.post("/test", authenticate, authorize("ADMIN"), createTestCustomer);

export default router;
