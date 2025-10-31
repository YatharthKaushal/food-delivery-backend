import express from "express";
import {
  createSubscription,
  getMySubscriptions,
  getMyActiveSubscriptions,
  getMySubscriptionById,
  cancelMySubscription,
  useVoucher,
  checkActiveSubscription,
  getMySubscriptionSummary,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscriptionStatus,
  deleteSubscription,
  restoreSubscription,
  getSubscriptionStats,
  updateExpiredSubscriptions,
} from "./subscription.controller.js";
import { verifyFirebaseToken } from "../middleware/firebaseToken.middleware.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Customer Routes - Require Firebase authentication
 * These routes allow customers to manage their own subscriptions
 */

// POST /api/subscriptions/purchase - Purchase a new subscription
router.post("/purchase", verifyFirebaseToken, createSubscription);

// GET /api/subscriptions/my - Get customer's own subscriptions
router.get("/my", verifyFirebaseToken, getMySubscriptions);

// GET /api/subscriptions/my/active - Get customer's active subscriptions
router.get("/my/active", verifyFirebaseToken, getMyActiveSubscriptions);

// GET /api/subscriptions/my/summary - Get customer's subscription summary
router.get("/my/summary", verifyFirebaseToken, getMySubscriptionSummary);

// GET /api/subscriptions/my/check - Check if customer has active subscription
router.get("/my/check", verifyFirebaseToken, checkActiveSubscription);

// GET /api/subscriptions/my/:id - Get customer's specific subscription
router.get("/my/:id", verifyFirebaseToken, getMySubscriptionById);

// PATCH /api/subscriptions/my/:id/cancel - Cancel customer's subscription
router.patch("/my/:id/cancel", verifyFirebaseToken, cancelMySubscription);

// POST /api/subscriptions/use-voucher - Use a voucher from subscription
router.post("/use-voucher", verifyFirebaseToken, useVoucher);

/**
 * Admin Routes - Require JWT authentication and admin authorization
 * These routes are for admin management of all subscriptions
 */

// GET /api/subscriptions - Get all subscriptions (with filtering and pagination)
router.get("/", authenticate, authorize("ADMIN"), getAllSubscriptions);

// GET /api/subscriptions/stats - Get subscription statistics
router.get("/stats", authenticate, authorize("ADMIN"), getSubscriptionStats);

// POST /api/subscriptions/update-expired - Update expired subscriptions
router.post(
  "/update-expired",
  authenticate,
  authorize("ADMIN"),
  updateExpiredSubscriptions
);

// GET /api/subscriptions/:id - Get subscription by ID
router.get("/:id", authenticate, authorize("ADMIN"), getSubscriptionById);

// PATCH /api/subscriptions/:id/status - Update subscription status
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  updateSubscriptionStatus
);

// DELETE /api/subscriptions/:id - Soft delete subscription
router.delete("/:id", authenticate, authorize("ADMIN"), deleteSubscription);

// PATCH /api/subscriptions/:id/restore - Restore deleted subscription
router.patch(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  restoreSubscription
);

export default router;
