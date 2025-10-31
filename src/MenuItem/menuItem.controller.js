/**
 * MenuItem Controller
 * Handles all CRUD operations and business logic for menu items
 * @module MenuItem/Controller
 */

import MenuItem from "../schema/MenuItem.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import mongoose from "mongoose";

/**
 * Create a new menu item
 * @access Admin only (via authenticate middleware)
 * @route POST /api/menu-items
 * @param {Object} req.body - Menu item data
 * @returns {Object} 201 - Created menu item
 */
export const createMenuItem = async (req, res) => {
  try {
    const { name, content, description, media, mealType, price, compareAtPrice, isLive } = req.body;

    // Validate required fields
    if (!name || !content || !mealType || price === undefined) {
      return sendError(res, 400, "Missing required fields: name, content, mealType, and price are required");
    }

    // Validate mealType enum
    if (!["LUNCH", "DINNER"].includes(mealType.toUpperCase())) {
      return sendError(res, 400, "Invalid mealType. Must be either LUNCH or DINNER");
    }

    // Validate price
    if (typeof price !== "number" || price < 0) {
      return sendError(res, 400, "Price must be a non-negative number");
    }

    // Validate compareAtPrice if provided
    if (compareAtPrice !== undefined && compareAtPrice !== null) {
      if (typeof compareAtPrice !== "number" || compareAtPrice < 0) {
        return sendError(res, 400, "Compare at price must be a non-negative number");
      }
      if (compareAtPrice <= price) {
        return sendError(res, 400, "Compare at price must be greater than price");
      }
    }

    // Create new menu item
    const menuItem = new MenuItem({
      name: name.trim(),
      content: content.trim(),
      description: description ? description.trim() : undefined,
      media,
      mealType: mealType.toUpperCase(),
      price,
      compareAtPrice: compareAtPrice || null,
      isLive: isLive || false,
    });

    await menuItem.save();

    return sendSuccess(res, 201, "Menu item created successfully", menuItem);
  } catch (error) {
    console.error("Error creating menu item:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to create menu item. Please try again");
  }
};

/**
 * Get all menu items with optional filtering
 * @access Public (no authentication required)
 * @route GET /api/menu-items
 * @query {string} mealType - Filter by meal type (LUNCH/DINNER)
 * @query {boolean} isLive - Filter by live status
 * @query {boolean} includeDeleted - Include deleted items (admin only)
 * @query {number} minPrice - Minimum price filter
 * @query {number} maxPrice - Maximum price filter
 * @query {string} search - Text search in name, content, description
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} sortBy - Sort field (default: createdAt)
 * @query {string} sortOrder - Sort order: asc/desc (default: desc)
 * @returns {Object} 200 - List of menu items with pagination
 */
export const getAllMenuItems = async (req, res) => {
  try {
    const {
      mealType,
      isLive,
      includeDeleted,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query filter
    const filter = {};

    // Only include deleted items if explicitly requested (admin only)
    if (includeDeleted === "true" && req.user) {
      // Admin can see deleted items
    } else {
      filter.isDeleted = false;
    }

    // Filter by meal type
    if (mealType) {
      const upperMealType = mealType.toUpperCase();
      if (!["LUNCH", "DINNER"].includes(upperMealType)) {
        return sendError(res, 400, "Invalid mealType. Must be LUNCH or DINNER");
      }
      filter.mealType = upperMealType;
    }

    // Filter by live status
    if (isLive !== undefined) {
      filter.isLive = isLive === "true";
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        const min = parseFloat(minPrice);
        if (isNaN(min) || min < 0) {
          return sendError(res, 400, "Invalid minPrice. Must be a non-negative number");
        }
        filter.price.$gte = min;
      }
      if (maxPrice !== undefined) {
        const max = parseFloat(maxPrice);
        if (isNaN(max) || max < 0) {
          return sendError(res, 400, "Invalid maxPrice. Must be a non-negative number");
        }
        filter.price.$lte = max;
      }
    }

    // Text search
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page

    if (isNaN(pageNum) || pageNum < 1) {
      return sendError(res, 400, "Invalid page number");
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return sendError(res, 400, "Invalid limit");
    }

    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOptions = {};
    const validSortFields = ["name", "price", "mealType", "createdAt", "updatedAt"];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1; // Default sort
    }

    // Execute query with pagination
    const [menuItems, totalCount] = await Promise.all([
      MenuItem.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      MenuItem.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);

    return sendSuccess(res, 200, "Menu items retrieved successfully", {
      menuItems,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return sendError(res, 500, "Failed to retrieve menu items. Please try again");
  }
};

/**
 * Get a single menu item by ID
 * @access Public
 * @route GET /api/menu-items/:id
 * @param {string} req.params.id - Menu item ID
 * @returns {Object} 200 - Menu item details
 */
export const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Build query - only show non-deleted items unless user is admin
    const query = { _id: id };
    if (!req.user) {
      query.isDeleted = false;
    }

    const menuItem = await MenuItem.findOne(query);

    if (!menuItem) {
      return sendError(res, 404, "Menu item not found");
    }

    return sendSuccess(res, 200, "Menu item retrieved successfully", menuItem);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return sendError(res, 500, "Failed to retrieve menu item. Please try again");
  }
};

/**
 * Update a menu item
 * @access Admin only
 * @route PUT /api/menu-items/:id
 * @param {string} req.params.id - Menu item ID
 * @param {Object} req.body - Updated menu item data
 * @returns {Object} 200 - Updated menu item
 */
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists and is not deleted
    const existingMenuItem = await MenuItem.findOne({ _id: id, isDeleted: false });

    if (!existingMenuItem) {
      return sendError(res, 404, "Menu item not found or has been deleted");
    }

    // Validate updates
    if (updates.mealType && !["LUNCH", "DINNER"].includes(updates.mealType.toUpperCase())) {
      return sendError(res, 400, "Invalid mealType. Must be LUNCH or DINNER");
    }

    if (updates.price !== undefined) {
      if (typeof updates.price !== "number" || updates.price < 0) {
        return sendError(res, 400, "Price must be a non-negative number");
      }
    }

    if (updates.compareAtPrice !== undefined && updates.compareAtPrice !== null) {
      const priceToCompare = updates.price !== undefined ? updates.price : existingMenuItem.price;
      if (typeof updates.compareAtPrice !== "number" || updates.compareAtPrice < 0) {
        return sendError(res, 400, "Compare at price must be a non-negative number");
      }
      if (updates.compareAtPrice <= priceToCompare) {
        return sendError(res, 400, "Compare at price must be greater than price");
      }
    }

    // Prevent direct modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;

    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.content) updates.content = updates.content.trim();
    if (updates.description) updates.description = updates.description.trim();
    if (updates.mealType) updates.mealType = updates.mealType.toUpperCase();

    // Update menu item
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    return sendSuccess(res, 200, "Menu item updated successfully", updatedMenuItem);
  } catch (error) {
    console.error("Error updating menu item:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to update menu item. Please try again");
  }
};

/**
 * Soft delete a menu item
 * @access Admin only
 * @route DELETE /api/menu-items/:id
 * @param {string} req.params.id - Menu item ID
 * @returns {Object} 200 - Success message
 */
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists and is not already deleted
    const menuItem = await MenuItem.findOne({ _id: id, isDeleted: false });

    if (!menuItem) {
      return sendError(res, 404, "Menu item not found or already deleted");
    }

    // Soft delete - mark as deleted
    menuItem.isDeleted = true;
    menuItem.deletedAt = new Date();
    menuItem.isLive = false; // Also mark as not live

    await menuItem.save();

    return sendSuccess(res, 200, "Menu item deleted successfully", {
      id: menuItem._id,
      deletedAt: menuItem.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return sendError(res, 500, "Failed to delete menu item. Please try again");
  }
};

/**
 * Restore a soft-deleted menu item
 * @access Admin only
 * @route POST /api/menu-items/:id/restore
 * @param {string} req.params.id - Menu item ID
 * @returns {Object} 200 - Restored menu item
 */
export const restoreMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists and is deleted
    const menuItem = await MenuItem.findOne({ _id: id, isDeleted: true });

    if (!menuItem) {
      return sendError(res, 404, "Deleted menu item not found");
    }

    // Restore menu item
    menuItem.isDeleted = false;
    menuItem.deletedAt = null;

    await menuItem.save();

    return sendSuccess(res, 200, "Menu item restored successfully", menuItem);
  } catch (error) {
    console.error("Error restoring menu item:", error);
    return sendError(res, 500, "Failed to restore menu item. Please try again");
  }
};

/**
 * Permanently delete a menu item
 * @access Admin only
 * @route DELETE /api/menu-items/:id/permanent
 * @param {string} req.params.id - Menu item ID
 * @returns {Object} 200 - Success message
 */
export const permanentlyDeleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return sendError(res, 404, "Menu item not found");
    }

    // Permanently delete from database
    await MenuItem.findByIdAndDelete(id);

    return sendSuccess(res, 200, "Menu item permanently deleted", {
      id,
      name: menuItem.name,
    });
  } catch (error) {
    console.error("Error permanently deleting menu item:", error);
    return sendError(res, 500, "Failed to permanently delete menu item. Please try again");
  }
};

/**
 * Toggle menu item live status
 * @access Admin only
 * @route PATCH /api/menu-items/:id/toggle-live
 * @param {string} req.params.id - Menu item ID
 * @returns {Object} 200 - Updated menu item
 */
export const toggleMenuItemLiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists and is not deleted
    const menuItem = await MenuItem.findOne({ _id: id, isDeleted: false });

    if (!menuItem) {
      return sendError(res, 404, "Menu item not found or has been deleted");
    }

    // Toggle isLive status
    menuItem.isLive = !menuItem.isLive;
    await menuItem.save();

    return sendSuccess(res, 200, `Menu item ${menuItem.isLive ? "activated" : "deactivated"} successfully`, menuItem);
  } catch (error) {
    console.error("Error toggling menu item live status:", error);
    return sendError(res, 500, "Failed to update menu item status. Please try again");
  }
};

/**
 * Bulk update menu items (e.g., bulk activate/deactivate)
 * @access Admin only
 * @route PATCH /api/menu-items/bulk-update
 * @body {Array} ids - Array of menu item IDs
 * @body {Object} updates - Updates to apply to all items
 * @returns {Object} 200 - Bulk update result
 */
export const bulkUpdateMenuItems = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 400, "ids must be a non-empty array");
    }

    if (!updates || typeof updates !== "object") {
      return sendError(res, 400, "updates object is required");
    }

    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return sendError(res, 400, "Invalid menu item ID format", { invalidIds });
    }

    // Prevent modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;

    // Validate updates
    if (updates.mealType && !["LUNCH", "DINNER"].includes(updates.mealType.toUpperCase())) {
      return sendError(res, 400, "Invalid mealType. Must be LUNCH or DINNER");
    }

    if (updates.price !== undefined && (typeof updates.price !== "number" || updates.price < 0)) {
      return sendError(res, 400, "Price must be a non-negative number");
    }

    // Bulk update
    const result = await MenuItem.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { $set: updates },
      { runValidators: true }
    );

    return sendSuccess(res, 200, "Bulk update completed successfully", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      requestedCount: ids.length,
    });
  } catch (error) {
    console.error("Error bulk updating menu items:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to bulk update menu items. Please try again");
  }
};

/**
 * Get menu item statistics
 * @access Admin only
 * @route GET /api/menu-items/stats
 * @returns {Object} 200 - Menu item statistics
 */
export const getMenuItemStats = async (req, res) => {
  try {
    const stats = await MenuItem.aggregate([
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          liveCount: [{ $match: { isLive: true, isDeleted: false } }, { $count: "count" }],
          deletedCount: [{ $match: { isDeleted: true } }, { $count: "count" }],
          byMealType: [
            { $match: { isDeleted: false } },
            { $group: { _id: "$mealType", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
          ],
          priceStats: [
            { $match: { isDeleted: false } },
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
                avgPrice: { $avg: "$price" },
              },
            },
          ],
        },
      },
    ]);

    const result = {
      total: stats[0].totalCount[0]?.count || 0,
      live: stats[0].liveCount[0]?.count || 0,
      deleted: stats[0].deletedCount[0]?.count || 0,
      byMealType: stats[0].byMealType,
      priceStats: stats[0].priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
    };

    return sendSuccess(res, 200, "Menu item statistics retrieved successfully", result);
  } catch (error) {
    console.error("Error fetching menu item stats:", error);
    return sendError(res, 500, "Failed to retrieve statistics. Please try again");
  }
};
