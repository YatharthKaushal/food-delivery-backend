import express from "express";
import {
  generateVouchersForSubscription,
  getMyVouchers,
  getMyAvailableVouchers,
  getMyVoucherById,
  useVoucher,
  getMyVoucherSummary,
  getAllVouchers,
  getVoucherById,
  updateVoucherStatus,
  deleteVoucher,
  restoreVoucher,
  updateExpiredVouchers,
  getVoucherStats,
  getVouchersBySubscription,
  bulkDeleteVouchersBySubscription,
} from "./voucher.controller.js";
import { verifyFirebaseToken } from "../middleware/firebaseToken.middleware.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Customer Routes - Require Firebase authentication
 * These routes allow customers to view and use their own vouchers
 */

// GET /api/vouchers/my - Get customer's own vouchers
router.get("/my", verifyFirebaseToken, getMyVouchers);

// GET /api/vouchers/my/available - Get customer's available vouchers
router.get("/my/available", verifyFirebaseToken, getMyAvailableVouchers);

// GET /api/vouchers/my/summary - Get customer's voucher summary
router.get("/my/summary", verifyFirebaseToken, getMyVoucherSummary);

// GET /api/vouchers/my/:id - Get customer's specific voucher
router.get("/my/:id", verifyFirebaseToken, getMyVoucherById);

// POST /api/vouchers/use - Use/redeem a voucher
router.post("/use", verifyFirebaseToken, useVoucher);

/**
 * Admin Routes - Require JWT authentication and admin authorization
 * These routes are for admin management of all vouchers
 */

// GET /api/vouchers - Get all vouchers (with filtering and pagination)
router.get("/", authenticate, authorize("ADMIN"), getAllVouchers);

// GET /api/vouchers/stats - Get voucher statistics
router.get("/stats", authenticate, authorize("ADMIN"), getVoucherStats);

// POST /api/vouchers/generate - Generate vouchers for a subscription
router.post(
  "/generate",
  authenticate,
  authorize("ADMIN"),
  generateVouchersForSubscription
);

// POST /api/vouchers/update-expired - Update expired vouchers
router.post(
  "/update-expired",
  authenticate,
  authorize("ADMIN"),
  updateExpiredVouchers
);

// GET /api/vouchers/subscription/:subscriptionId - Get vouchers by subscription
router.get(
  "/subscription/:subscriptionId",
  authenticate,
  authorize("ADMIN"),
  getVouchersBySubscription
);

// DELETE /api/vouchers/subscription/:subscriptionId - Bulk delete vouchers by subscription
router.delete(
  "/subscription/:subscriptionId",
  authenticate,
  authorize("ADMIN"),
  bulkDeleteVouchersBySubscription
);

// GET /api/vouchers/:id - Get voucher by ID
router.get("/:id", authenticate, authorize("ADMIN"), getVoucherById);

// PATCH /api/vouchers/:id/status - Update voucher status
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  updateVoucherStatus
);

// DELETE /api/vouchers/:id - Soft delete voucher
router.delete("/:id", authenticate, authorize("ADMIN"), deleteVoucher);

// PATCH /api/vouchers/:id/restore - Restore deleted voucher
router.patch("/:id/restore", authenticate, authorize("ADMIN"), restoreVoucher);

export default router;
