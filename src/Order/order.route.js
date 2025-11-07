/**
 * Order Routes
 * Defines all routes for order operations
 * @module Order/Routes
 */

import express from "express";
import {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  restoreOrder,
  getOrdersByDateRange,
  getOrderStats,
  getUpcomingOrders,
  updateOrder,
  adminCancelOrder,
  getKitchenDashboard,
  acceptOrder,
  rejectOrder,
  updatePreparationStatus,
  markReadyForDelivery,
  bulkAcceptOrders,
  assignDriverManually,
  autoAssignDriver,
  requestRefund,
  processRefund,
  getRefundRequests,
} from "./order.controller.js";
import { verifyFirebaseToken } from "../middleware/firebaseToken.middleware.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { attachCustomer } from "../middleware/attachCustomer.middleware.js";

const router = express.Router();

/**
 * Kitchen Staff Routes (JWT Authentication Required)
 * These routes are accessible to kitchen staff and admins
 */

/**
 * @route   GET /api/orders/kitchen/dashboard
 * @desc    Get kitchen dashboard with today's orders
 * @access  Kitchen Staff, Admin
 */
router.get(
  "/kitchen/dashboard",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  getKitchenDashboard
);

/**
 * @route   POST /api/orders/bulk-accept
 * @desc    Accept multiple orders at once
 * @access  Kitchen Staff, Admin
 * @body    orderIds - Array of order IDs to accept
 */
router.post(
  "/bulk-accept",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  bulkAcceptOrders
);

/**
 * @route   POST /api/orders/:orderId/accept
 * @desc    Accept a placed order
 * @access  Kitchen Staff, Admin
 */
router.post(
  "/:orderId/accept",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  acceptOrder
);

/**
 * @route   POST /api/orders/:orderId/reject
 * @desc    Reject a placed order
 * @access  Kitchen Staff, Admin
 * @body    reason - Optional reason for rejection
 */
router.post(
  "/:orderId/reject",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  rejectOrder
);

/**
 * @route   PATCH /api/orders/:orderId/preparation-status
 * @desc    Update order preparation status
 * @access  Kitchen Staff, Admin
 * @body    preparationStatus - Status: started, in-progress, almost-ready
 */
router.patch(
  "/:orderId/preparation-status",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  updatePreparationStatus
);

/**
 * @route   POST /api/orders/:orderId/ready
 * @desc    Mark order as ready for delivery
 * @access  Kitchen Staff, Admin
 */
router.post(
  "/:orderId/ready",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  markReadyForDelivery
);

/**
 * Admin Routes (JWT Authentication Required)
 * These routes are accessible only to admins
 */

/**
 * @route   GET /api/orders/all
 * @desc    Get all orders with filtering and pagination
 * @access  Admin only
 * @query   customerId - Filter by customer ID
 * @query   mealType - Filter by LUNCH or DINNER
 * @query   scheduledForDate - Filter by scheduled date
 * @query   status - Filter by order status (active, delivered, cancelled, failed)
 * @query   includeDeleted - Include deleted orders (default: false)
 * @query   sortBy - Sort field (default: scheduledForDate)
 * @query   sortOrder - Sort order: asc/desc (default: desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get(
  "/all",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF", "DELIVERY_MANAGER"),
  getAllOrders
);

/**
 * @route   GET /api/orders/admin/:id
 * @desc    Get order by ID (admin access)
 * @access  Admin only
 */
router.get(
  "/admin/:id",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF", "DELIVERY_MANAGER"),
  getOrderById
);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Admin only
 */
router.get(
  "/stats",
  authenticate,
  authorize("ADMIN"),
  getOrderStats
);

/**
 * @route   GET /api/orders/upcoming
 * @desc    Get upcoming orders
 * @access  Admin only
 * @query   days - Number of days to look ahead (default: 1)
 * @query   mealType - Filter by LUNCH or DINNER
 */
router.get(
  "/upcoming",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF", "DELIVERY_MANAGER"),
  getUpcomingOrders
);

/**
 * @route   GET /api/orders/date-range
 * @desc    Get orders within a date range
 * @access  Admin only
 * @query   startDate - Start date (required)
 * @query   endDate - End date (required)
 * @query   mealType - Filter by LUNCH or DINNER
 */
router.get(
  "/date-range",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF", "DELIVERY_MANAGER"),
  getOrdersByDateRange
);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Admin only
 * @body    status - New status (accepted, preparing, outForDelivery, delivered, failed)
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF", "DELIVERY_MANAGER"),
  updateOrderStatus
);

/**
 * @route   PATCH /api/orders/:id/admin-cancel
 * @desc    Cancel order (admin with optional time restriction bypass)
 * @access  Admin only
 * @body    bypassTimeRestrictions - Set to true to bypass time restrictions (default: false)
 * @body    reason - Cancellation reason (optional)
 */
router.patch(
  "/:id/admin-cancel",
  authenticate,
  authorize("ADMIN", "KITCHEN_STAFF"),
  adminCancelOrder
);

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order details
 * @access  Admin only
 */
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updateOrder
);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete order (soft delete)
 * @access  Admin only
 */
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteOrder
);

/**
 * @route   PATCH /api/orders/:id/restore
 * @desc    Restore deleted order
 * @access  Admin only
 */
router.patch(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  restoreOrder
);

/**
 * @route   POST /api/orders/:orderId/assign-driver
 * @desc    Manually assign a driver to an order
 * @access  Admin, Delivery Manager
 * @body    driverId - Driver ID to assign
 */
router.post(
  "/:orderId/assign-driver",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  assignDriverManually
);

/**
 * @route   POST /api/orders/:orderId/auto-assign-driver
 * @desc    Automatically assign an available driver to an order
 * @access  Admin, Delivery Manager
 */
router.post(
  "/:orderId/auto-assign-driver",
  authenticate,
  authorize("ADMIN", "DELIVERY_MANAGER"),
  autoAssignDriver
);

/**
 * Refund Routes
 */

/**
 * @route   GET /api/orders/refunds
 * @desc    Get all refund requests (filtered by status)
 * @access  Admin only
 * @query   status - Filter by status: pending, processed, rejected, none (default: pending)
 */
router.get(
  "/refunds",
  authenticate,
  authorize("ADMIN"),
  getRefundRequests
);

/**
 * @route   POST /api/orders/:orderId/refund/process
 * @desc    Admin processes refund request (approve or reject)
 * @access  Admin only
 * @body    action - "approve" or "reject"
 * @body    adminNotes - Admin notes (optional)
 */
router.post(
  "/:orderId/refund/process",
  authenticate,
  authorize("ADMIN"),
  processRefund
);

/**
 * @route   POST /api/orders/:orderId/refund
 * @desc    Customer requests refund for an order
 * @access  Customer (Firebase authenticated)
 * @body    reason - Reason for refund request (optional)
 */
router.post("/:orderId/refund", verifyFirebaseToken, attachCustomer, requestRefund);

/**
 * Customer Routes (Firebase Authentication Required)
 * These routes are accessible to authenticated customers
 * IMPORTANT: These must come after all specific routes to avoid route conflicts
 */

/**
 * @route   GET /api/orders/my-orders
 * @desc    Get customer's own orders with filtering and pagination
 * @access  Customer (Firebase authenticated)
 * @query   mealType - Filter by LUNCH or DINNER
 * @query   scheduledForDate - Filter by scheduled date
 * @query   status - Filter by order status (active, delivered, cancelled)
 * @query   includeDeleted - Include deleted orders (default: false)
 * @query   sortBy - Sort field (default: scheduledForDate)
 * @query   sortOrder - Sort order: asc/desc (default: desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get("/my-orders", verifyFirebaseToken, attachCustomer, getMyOrders);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Customer (Firebase authenticated)
 */
router.post("/", verifyFirebaseToken, attachCustomer, createOrder);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel customer's own order
 * @access  Customer (Firebase authenticated)
 */
router.patch("/:id/cancel", verifyFirebaseToken, attachCustomer, cancelMyOrder);

/**
 * @route   GET /api/orders/:id
 * @desc    Get customer's own order by ID
 * @access  Customer (Firebase authenticated)
 * IMPORTANT: This must be the LAST route to avoid catching specific routes
 */
router.get("/:id", verifyFirebaseToken, attachCustomer, getMyOrderById);

export default router;
