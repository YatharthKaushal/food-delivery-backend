/**
 * Addon Routes
 * Defines all routes for addon operations with appropriate authentication
 * @module MenuItem/AddonRoutes
 */

import express from "express";
import {
  createAddon,
  getAllAddons,
  getAddonsByMenuItem,
  getAddonById,
  updateAddon,
  deleteAddon,
  restoreAddon,
  permanentlyDeleteAddon,
  toggleAddonLiveStatus,
  bulkUpdateAddons,
  deleteAddonsByMenuItem,
  getAddonStats,
} from "./addon.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { verifyFirebaseTokenOptional } from "../middleware/firebaseToken.middleware.js";

const router = express.Router();

/**
 * Admin-only routes with static paths - Must be defined before dynamic /:id routes
 * These routes are restricted to authenticated admin users
 */

// GET /api/addons/stats - Get addon statistics
router.get("/stats", authenticate, getAddonStats);

// PATCH /api/addons/bulk-update - Bulk update addons
router.patch("/bulk-update", authenticate, bulkUpdateAddons);

/**
 * Public routes - No authentication required
 * These routes are accessible to anyone (customers browsing addons)
 */

// GET /api/addons - Get all addons with filtering and pagination
// Uses optional Firebase auth to determine if deleted items should be shown
router.get("/", verifyFirebaseTokenOptional, getAllAddons);

// GET /api/addons/menu-item/:menuItemId - Get all addons for a specific menu item
// Uses optional Firebase auth to determine if deleted items should be shown
router.get("/menu-item/:menuItemId", verifyFirebaseTokenOptional, getAddonsByMenuItem);

// GET /api/addons/:id - Get single addon by ID
// Uses optional Firebase auth to determine if deleted items should be shown
router.get("/:id", verifyFirebaseTokenOptional, getAddonById);

/**
 * Admin-only routes with dynamic paths - Require JWT authentication
 * These routes are restricted to authenticated admin users
 */

// POST /api/addons - Create new addon
router.post("/", authenticate, createAddon);

// PUT /api/addons/:id - Update addon
router.put("/:id", authenticate, updateAddon);

// DELETE /api/addons/:id - Soft delete addon
router.delete("/:id", authenticate, deleteAddon);

// POST /api/addons/:id/restore - Restore soft-deleted addon
router.post("/:id/restore", authenticate, restoreAddon);

// DELETE /api/addons/:id/permanent - Permanently delete addon
router.delete("/:id/permanent", authenticate, permanentlyDeleteAddon);

// PATCH /api/addons/:id/toggle-live - Toggle addon live status
router.patch("/:id/toggle-live", authenticate, toggleAddonLiveStatus);

// DELETE /api/addons/menu-item/:menuItemId - Delete all addons for a menu item
router.delete("/menu-item/:menuItemId", authenticate, deleteAddonsByMenuItem);

export default router;
