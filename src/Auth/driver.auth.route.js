import express from "express";
import {
  getIsProfileComplete,
  onBoardingUser,
  createTestDriver,
} from "./driver.auth.controller.js";
import { verifyFirebaseToken } from "../middleware/firebaseToken.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/auth/delivery-driver/status
 * @desc    Get delivery driver profile completion status
 * @access  Protected (requires Firebase token)
 */
router.get("/status", verifyFirebaseToken, getIsProfileComplete);

/**
 * @route   POST /api/auth/delivery-driver/onboarding
 * @desc    Complete delivery driver onboarding
 * @access  Protected (requires Firebase token)
 */
router.post("/onboarding", verifyFirebaseToken, onBoardingUser);

/**
 * @route   POST /api/auth/delivery-driver/create-test
 * @desc    Create a test delivery driver (non-production only)
 * @access  Protected (requires admin JWT token)
 */
router.post("/create-test", authenticate, createTestDriver);

export default router;
