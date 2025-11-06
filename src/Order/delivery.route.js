/**
 * Delivery Routes
 * Defines all routes for delivery operations
 * @module Delivery/Routes
 */

import express from "express";
import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  getDeliveryByOrderId,
  assignDriver,
  updateDeliveryStatus,
  updateDelivery,
  deleteDelivery,
  restoreDelivery,
  getDeliveriesByDriver,
  getDeliveryStats,
  getActiveDeliveries,
  getPendingDeliveries,
} from "./delivery.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Admin Routes (JWT Authentication Required)
 * These routes are accessible only to admins and authorized staff
 */

/**
 * @route   POST /api/deliveries
 * @desc    Create a new delivery
 * @access  Admin only
 */
router.post("/", authenticate, authorize("ADMIN", "DELIVERY_MANAGER"), createDelivery);

/**
 * @route   GET /api/deliveries/all
 * @desc    Get all deliveries with filtering and pagination
 * @access  Admin, Delivery Manager
 * @query   customerId - Filter by customer ID
 * @query   deliveryDriverId - Filter by delivery driver ID
 * @query   orderId - Filter by order ID
 * @query   status - Filter by delivery status (PENDING, IN_PROGRESS, DELIVERED, FAILED)
 * @query   includeDeleted - Include deleted deliveries (default: false)
 * @query   sortBy - Sort field (default: createdAt)
 * @query   sortOrder - Sort order: asc/desc (default: desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get(
  "/all",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getAllDeliveries
);

/**
 * @route   GET /api/deliveries/stats
 * @desc    Get delivery statistics
 * @access  Admin only
 */
router.get("/stats", authenticate, authorize("ADMIN"), getDeliveryStats);

/**
 * @route   GET /api/deliveries/active
 * @desc    Get all active deliveries (in progress)
 * @access  Admin, Delivery Manager
 */
router.get(
  "/active",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getActiveDeliveries
);

/**
 * @route   GET /api/deliveries/pending
 * @desc    Get all pending deliveries (not yet assigned or picked up)
 * @access  Admin, Delivery Manager
 */
router.get(
  "/pending",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getPendingDeliveries
);

/**
 * @route   GET /api/deliveries/driver/:driverId
 * @desc    Get all deliveries assigned to a specific driver
 * @access  Admin, Delivery Manager
 * @query   status - Filter by delivery status (PENDING, IN_PROGRESS, DELIVERED, FAILED)
 * @query   includeDeleted - Include deleted deliveries (default: false)
 * @query   sortBy - Sort field (default: createdAt)
 * @query   sortOrder - Sort order: asc/desc (default: desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get(
  "/driver/:driverId",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getDeliveriesByDriver
);

/**
 * @route   GET /api/deliveries/order/:orderId
 * @desc    Get delivery for a specific order
 * @access  Admin, Delivery Manager
 */
router.get(
  "/order/:orderId",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getDeliveryByOrderId
);

/**
 * @route   GET /api/deliveries/:id
 * @desc    Get delivery by ID
 * @access  Admin, Delivery Manager
 */
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  getDeliveryById
);

/**
 * @route   PATCH /api/deliveries/:id/assign-driver
 * @desc    Assign or reassign a delivery driver to a delivery
 * @access  Admin, Delivery Manager
 * @body    deliveryDriverId - Delivery driver ID to assign
 */
router.patch(
  "/:id/assign-driver",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  assignDriver
);

/**
 * @route   PATCH /api/deliveries/:id/status
 * @desc    Update delivery status
 * @access  Admin, Delivery Manager
 * @body    status - New status (pickedUp, outForDelivery, delivered, failed)
 * @body    failedMessage - Required if status is 'failed'
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  updateDeliveryStatus
);

/**
 * @route   PUT /api/deliveries/:id
 * @desc    Update delivery details
 * @access  Admin only
 */
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  updateDelivery
);

/**
 * @route   DELETE /api/deliveries/:id
 * @desc    Delete delivery (soft delete)
 * @access  Admin only
 */
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteDelivery
);

/**
 * @route   PATCH /api/deliveries/:id/restore
 * @desc    Restore deleted delivery
 * @access  Admin only
 */
router.patch(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  restoreDelivery
);

export default router;
