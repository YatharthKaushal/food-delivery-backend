/**
 * Driver Routes
 * Defines all routes for driver delivery operations
 * @module Driver/Routes
 */

import express from "express";
import {
  getMyDeliveries,
  confirmPickup,
  confirmDelivery,
  updateDeliveryStatus,
  getMyProfile,
} from "./driver.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Driver Routes (JWT Authentication Required)
 * These routes are accessible to delivery drivers
 */

/**
 * @route   GET /api/driver/me
 * @desc    Get driver's own profile and stats
 * @access  Driver
 */
router.get("/me", authenticate, authorize("DRIVER"), getMyProfile);

/**
 * @route   GET /api/driver/my-deliveries
 * @desc    Get driver's assigned deliveries
 * @access  Driver
 */
router.get(
  "/my-deliveries",
  authenticate,
  authorize("DRIVER"),
  getMyDeliveries
);

/**
 * @route   POST /api/driver/orders/:orderId/pickup
 * @desc    Confirm pickup from kitchen
 * @access  Driver
 */
router.post(
  "/orders/:orderId/pickup",
  authenticate,
  authorize("DRIVER"),
  confirmPickup
);

/**
 * @route   POST /api/driver/orders/:orderId/deliver
 * @desc    Confirm delivery to customer
 * @access  Driver
 */
router.post(
  "/orders/:orderId/deliver",
  authenticate,
  authorize("DRIVER"),
  confirmDelivery
);

/**
 * @route   PATCH /api/driver/orders/:orderId/status
 * @desc    Update delivery status and location
 * @access  Driver
 * @body    location - { latitude: Number, longitude: Number }
 */
router.patch(
  "/orders/:orderId/status",
  authenticate,
  authorize("DRIVER"),
  updateDeliveryStatus
);

export default router;
