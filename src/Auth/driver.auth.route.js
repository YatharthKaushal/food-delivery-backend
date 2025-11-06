import express from "express";
import {
  registerDriver,
  loginDriver,
  onBoardingUser,
} from "./driver.auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/delivery-driver/register
 * @desc    Register a new delivery driver
 * @access  Public
 */
router.post("/register", registerDriver);

/**
 * @route   POST /api/auth/delivery-driver/login
 * @desc    Login delivery driver and get JWT token
 * @access  Public
 */
router.post("/login", loginDriver);

/**
 * @route   PUT /api/auth/delivery-driver/onboarding
 * @desc    Complete delivery driver onboarding
 * @access  Protected (requires JWT token)
 */
router.put("/onboarding", authenticate, onBoardingUser);

export default router;
