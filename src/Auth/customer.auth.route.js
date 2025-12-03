import express from "express";
import {
  getIsProfileComplete,
  onBoardingUser,
  createTestCustomer,
  requestAccountDeletion,
  getCustomerProfile,
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

/**
 * @route   DELETE /api/auth/customer/delete-account
 * @desc    Request account deletion (schedules deletion after 10 days grace period)
 * @access  Protected (Firebase Token Required)
 */
router.delete("/delete-account", verifyFirebaseToken, requestAccountDeletion);

/**
 * @route   GET /api/auth/customer/profile
 * @desc    Get comprehensive customer profile with orders, subscriptions, and vouchers
 * @access  Protected (Firebase Token Required)
 */
router.get("/profile", verifyFirebaseToken, getCustomerProfile);

export default router;
