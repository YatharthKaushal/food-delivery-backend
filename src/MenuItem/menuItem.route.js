/**
 * MenuItem Routes
 * Defines all routes for menu item operations with appropriate authentication
 * @module MenuItem/Routes
 */

import express from "express";
import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  restoreMenuItem,
  permanentlyDeleteMenuItem,
  toggleMenuItemLiveStatus,
  bulkUpdateMenuItems,
  getMenuItemStats,
} from "./menuItem.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { verifyFirebaseTokenOptional } from "../middleware/firebaseToken.middleware.js";

const router = express.Router();

/**
 * Admin-only routes with static paths - Must be defined before dynamic /:id routes
 * These routes are restricted to authenticated admin users
 */

// GET /api/menu-items/stats - Get menu item statistics
router.get("/stats", authenticate, getMenuItemStats);

// PATCH /api/menu-items/bulk-update - Bulk update menu items
router.patch("/bulk-update", authenticate, bulkUpdateMenuItems);

/**
 * Public routes - No authentication required
 * These routes are accessible to anyone (customers browsing menu)
 */

// GET /api/menu-items - Get all menu items with filtering and pagination
// Uses optional Firebase auth to determine if deleted items should be shown
router.get("/", verifyFirebaseTokenOptional, getAllMenuItems);

// GET /api/menu-items/:id - Get single menu item by ID
// Uses optional Firebase auth to determine if deleted items should be shown
router.get("/:id", verifyFirebaseTokenOptional, getMenuItemById);

/**
 * Admin-only routes with dynamic paths - Require JWT authentication
 * These routes are restricted to authenticated admin users
 */

// POST /api/menu-items - Create new menu item
router.post("/", authenticate, createMenuItem);

// PUT /api/menu-items/:id - Update menu item
router.put("/:id", authenticate, updateMenuItem);

// DELETE /api/menu-items/:id - Soft delete menu item
router.delete("/:id", authenticate, deleteMenuItem);

// POST /api/menu-items/:id/restore - Restore soft-deleted menu item
router.post("/:id/restore", authenticate, restoreMenuItem);

// DELETE /api/menu-items/:id/permanent - Permanently delete menu item
router.delete("/:id/permanent", authenticate, permanentlyDeleteMenuItem);

// PATCH /api/menu-items/:id/toggle-live - Toggle menu item live status
router.patch("/:id/toggle-live", authenticate, toggleMenuItemLiveStatus);

export default router;
