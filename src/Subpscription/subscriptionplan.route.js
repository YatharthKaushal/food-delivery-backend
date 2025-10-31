import express from "express";
import {
  createSubscriptionPlan,
  getAllSubscriptionPlansAdmin,
  getActiveSubscriptionPlans,
  getSubscriptionPlanByIdAdmin,
  getActiveSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  permanentlyDeleteSubscriptionPlan,
  activateSubscriptionPlan,
  getSubscriptionPlansByType,
  getSubscriptionPlanStats,
} from "./subscriptionplan.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Public Routes - No authentication required
 * These routes are for customers to browse available subscription plans
 */

// GET /api/subscription-plans/public - Get all active subscription plans
router.get("/public", getActiveSubscriptionPlans);

// GET /api/subscription-plans/public/grouped - Get active plans grouped by type
router.get("/public/grouped", getSubscriptionPlansByType);

// GET /api/subscription-plans/public/:id - Get specific active subscription plan
router.get("/public/:id", getActiveSubscriptionPlanById);

/**
 * Admin Routes - Require authentication and authorization
 * These routes are for admin management of subscription plans
 */

// POST /api/subscription-plans - Create new subscription plan
router.post("/", authenticate, authorize("ADMIN"), createSubscriptionPlan);

// GET /api/subscription-plans - Get all subscription plans (includes inactive)
router.get("/", authenticate, authorize("ADMIN"), getAllSubscriptionPlansAdmin);

// GET /api/subscription-plans/stats - Get subscription plan statistics
router.get("/stats", authenticate, authorize("ADMIN"), getSubscriptionPlanStats);

// GET /api/subscription-plans/:id - Get subscription plan by ID
router.get("/:id", authenticate, authorize("ADMIN"), getSubscriptionPlanByIdAdmin);

// PUT /api/subscription-plans/:id - Update subscription plan
router.put("/:id", authenticate, authorize("ADMIN"), updateSubscriptionPlan);

// PATCH /api/subscription-plans/:id/activate - Activate subscription plan
router.patch("/:id/activate", authenticate, authorize("ADMIN"), activateSubscriptionPlan);

// DELETE /api/subscription-plans/:id - Soft delete subscription plan (set isActive to false)
router.delete("/:id", authenticate, authorize("ADMIN"), deleteSubscriptionPlan);

// DELETE /api/subscription-plans/:id/permanent - Permanently delete subscription plan
router.delete(
  "/:id/permanent",
  authenticate,
  authorize("ADMIN"),
  permanentlyDeleteSubscriptionPlan
);

export default router;
