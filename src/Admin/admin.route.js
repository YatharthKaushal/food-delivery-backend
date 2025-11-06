/**
 * Admin Routes
 * Defines all routes for admin dashboard and management operations
 * @module Admin/Routes
 */

import express from "express";
import {
  getOverallStats,
  getOrderAnalytics,
  getRevenueReport,
} from "./admin.dashboard.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Admin Dashboard Routes (JWT Authentication Required)
 * These routes are accessible only to admins
 */

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get overall statistics for admin dashboard
 * @access  Admin only
 */
router.get(
  "/dashboard/stats",
  authenticate,
  authorize("ADMIN"),
  getOverallStats
);

/**
 * @route   GET /api/admin/dashboard/orders
 * @desc    Get order analytics for a date range
 * @access  Admin only
 * @query   startDate - Start date (optional)
 * @query   endDate - End date (optional)
 */
router.get(
  "/dashboard/orders",
  authenticate,
  authorize("ADMIN"),
  getOrderAnalytics
);

/**
 * @route   GET /api/admin/dashboard/revenue
 * @desc    Get revenue report grouped by time period
 * @access  Admin only
 * @query   period - Time period: day, week, month, year (default: month)
 */
router.get(
  "/dashboard/revenue",
  authenticate,
  authorize("ADMIN"),
  getRevenueReport
);

export default router;
