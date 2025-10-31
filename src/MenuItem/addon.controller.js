/**
 * Addon Controller
 * Handles all CRUD operations and business logic for addons
 * @module MenuItem/AddonController
 */

import Addon from "../schema/Addon.schema.js";
import MenuItem from "../schema/MenuItem.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import mongoose from "mongoose";

/**
 * Create a new addon
 * @access Admin only (via authenticate middleware)
 * @route POST /api/addons
 * @param {Object} req.body - Addon data
 * @returns {Object} 201 - Created addon
 */
export const createAddon = async (req, res) => {
  try {
    const { name, menuItemId, contents, description, price, tags, category, imageUrl, isLive } = req.body;

    // Validate required fields
    if (!name || !menuItemId || price === undefined) {
      return sendError(res, 400, "Missing required fields: name, menuItemId, and price are required");
    }

    // Validate MongoDB ObjectId for menuItemId
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return sendError(res, 400, "Invalid menuItemId format");
    }

    // Check if referenced menu item exists and is not deleted
    const menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false });
    if (!menuItem) {
      return sendError(res, 404, "Menu item not found or has been deleted");
    }

    // Validate price
    if (typeof price !== "number" || price < 0) {
      return sendError(res, 400, "Price must be a non-negative number");
    }

    // Validate category if provided
    const validCategories = [
      "BEVERAGE",
      "SWEETS",
      "CONDIMENT",
      "ICE_CREAM",
      "LAVA_CAKE",
      "DESSERT",
      "SNACK",
      "SIDE_DISH",
      "OTHER",
    ];
    if (category && !validCategories.includes(category.toUpperCase())) {
      return sendError(res, 400, `Invalid category. Must be one of: ${validCategories.join(", ")}`);
    }

    // Validate tags if provided
    if (tags && Array.isArray(tags)) {
      const invalidTags = tags.filter((tag) => !tag || typeof tag !== "string" || tag.trim().length === 0);
      if (invalidTags.length > 0) {
        return sendError(res, 400, "All tags must be non-empty strings");
      }
    }

    // Create new addon
    const addon = new Addon({
      name: name.trim(),
      menuItemId,
      contents: contents ? contents.trim() : undefined,
      description: description ? description.trim() : undefined,
      price,
      tags: tags && Array.isArray(tags) ? tags.map((tag) => tag.trim()) : [],
      category: category ? category.toUpperCase() : undefined,
      imageUrl: imageUrl ? imageUrl.trim() : undefined,
      isLive: isLive || false,
    });

    await addon.save();

    // Populate menu item details in response
    await addon.populate("menuItemId", "name mealType isLive");

    return sendSuccess(res, 201, "Addon created successfully", addon);
  } catch (error) {
    console.error("Error creating addon:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to create addon. Please try again");
  }
};

/**
 * Get all addons with optional filtering
 * @access Public (no authentication required)
 * @route GET /api/addons
 * @query {string} menuItemId - Filter by menu item ID
 * @query {string} category - Filter by category
 * @query {boolean} isLive - Filter by live status
 * @query {boolean} includeDeleted - Include deleted items (admin only)
 * @query {number} minPrice - Minimum price filter
 * @query {number} maxPrice - Maximum price filter
 * @query {string} search - Text search in name and description
 * @query {string} tags - Comma-separated tags to filter by
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} sortBy - Sort field (default: createdAt)
 * @query {string} sortOrder - Sort order: asc/desc (default: desc)
 * @query {boolean} populate - Populate menu item details (default: false)
 * @returns {Object} 200 - List of addons with pagination
 */
export const getAllAddons = async (req, res) => {
  try {
    const {
      menuItemId,
      category,
      isLive,
      includeDeleted,
      minPrice,
      maxPrice,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      populate = "false",
    } = req.query;

    // Build query filter
    const filter = {};

    // Only include deleted items if explicitly requested (admin only)
    if (includeDeleted === "true" && req.user) {
      // Admin can see deleted items
    } else {
      filter.isDeleted = false;
    }

    // Filter by menu item ID
    if (menuItemId) {
      if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
        return sendError(res, 400, "Invalid menuItemId format");
      }
      filter.menuItemId = menuItemId;
    }

    // Filter by category
    if (category) {
      const validCategories = [
        "BEVERAGE",
        "SWEETS",
        "CONDIMENT",
        "ICE_CREAM",
        "LAVA_CAKE",
        "DESSERT",
        "SNACK",
        "SIDE_DISH",
        "OTHER",
      ];
      const upperCategory = category.toUpperCase();
      if (!validCategories.includes(upperCategory)) {
        return sendError(res, 400, `Invalid category. Must be one of: ${validCategories.join(", ")}`);
      }
      filter.category = upperCategory;
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

    // Filter by tags
    if (tags && tags.trim()) {
      const tagArray = tags.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
      if (tagArray.length > 0) {
        filter.tags = { $in: tagArray };
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
    const validSortFields = ["name", "price", "category", "createdAt", "updatedAt"];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1; // Default sort
    }

    // Build query
    let query = Addon.find(filter).sort(sortOptions).skip(skip).limit(limitNum);

    // Populate menu item if requested
    if (populate === "true") {
      query = query.populate("menuItemId", "name content mealType price isLive");
    }

    // Execute query with pagination
    const [addons, totalCount] = await Promise.all([query.lean(), Addon.countDocuments(filter)]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);

    return sendSuccess(res, 200, "Addons retrieved successfully", {
      addons,
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
    console.error("Error fetching addons:", error);
    return sendError(res, 500, "Failed to retrieve addons. Please try again");
  }
};

/**
 * Get addons by menu item ID
 * @access Public
 * @route GET /api/addons/menu-item/:menuItemId
 * @param {string} req.params.menuItemId - Menu item ID
 * @returns {Object} 200 - List of addons for the menu item
 */
export const getAddonsByMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false });
    if (!menuItem) {
      return sendError(res, 404, "Menu item not found");
    }

    // Build query - only show live, non-deleted addons unless user is admin
    const query = { menuItemId, isDeleted: false };
    if (!req.user) {
      query.isLive = true; // Public users only see live addons
    }

    const addons = await Addon.find(query).sort({ category: 1, name: 1 }).lean();

    return sendSuccess(res, 200, "Addons retrieved successfully", {
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        mealType: menuItem.mealType,
      },
      addons,
      count: addons.length,
    });
  } catch (error) {
    console.error("Error fetching addons by menu item:", error);
    return sendError(res, 500, "Failed to retrieve addons. Please try again");
  }
};

/**
 * Get a single addon by ID
 * @access Public
 * @route GET /api/addons/:id
 * @param {string} req.params.id - Addon ID
 * @param {boolean} req.query.populate - Populate menu item details
 * @returns {Object} 200 - Addon details
 */
export const getAddonById = async (req, res) => {
  try {
    const { id } = req.params;
    const { populate = "false" } = req.query;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Build query - only show non-deleted items unless user is admin
    const query = { _id: id };
    if (!req.user) {
      query.isDeleted = false;
    }

    let addonQuery = Addon.findOne(query);

    // Populate menu item if requested
    if (populate === "true") {
      addonQuery = addonQuery.populate("menuItemId", "name content mealType price isLive");
    }

    const addon = await addonQuery;

    if (!addon) {
      return sendError(res, 404, "Addon not found");
    }

    return sendSuccess(res, 200, "Addon retrieved successfully", addon);
  } catch (error) {
    console.error("Error fetching addon:", error);
    return sendError(res, 500, "Failed to retrieve addon. Please try again");
  }
};

/**
 * Update an addon
 * @access Admin only
 * @route PUT /api/addons/:id
 * @param {string} req.params.id - Addon ID
 * @param {Object} req.body - Updated addon data
 * @returns {Object} 200 - Updated addon
 */
export const updateAddon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Check if addon exists and is not deleted
    const existingAddon = await Addon.findOne({ _id: id, isDeleted: false });

    if (!existingAddon) {
      return sendError(res, 404, "Addon not found or has been deleted");
    }

    // Validate menuItemId if being updated
    if (updates.menuItemId) {
      if (!mongoose.Types.ObjectId.isValid(updates.menuItemId)) {
        return sendError(res, 400, "Invalid menuItemId format");
      }
      const menuItem = await MenuItem.findOne({ _id: updates.menuItemId, isDeleted: false });
      if (!menuItem) {
        return sendError(res, 404, "Menu item not found or has been deleted");
      }
    }

    // Validate category if provided
    if (updates.category) {
      const validCategories = [
        "BEVERAGE",
        "SWEETS",
        "CONDIMENT",
        "ICE_CREAM",
        "LAVA_CAKE",
        "DESSERT",
        "SNACK",
        "SIDE_DISH",
        "OTHER",
      ];
      if (!validCategories.includes(updates.category.toUpperCase())) {
        return sendError(res, 400, `Invalid category. Must be one of: ${validCategories.join(", ")}`);
      }
      updates.category = updates.category.toUpperCase();
    }

    // Validate price if being updated
    if (updates.price !== undefined) {
      if (typeof updates.price !== "number" || updates.price < 0) {
        return sendError(res, 400, "Price must be a non-negative number");
      }
    }

    // Validate tags if provided
    if (updates.tags && Array.isArray(updates.tags)) {
      const invalidTags = updates.tags.filter((tag) => !tag || typeof tag !== "string" || tag.trim().length === 0);
      if (invalidTags.length > 0) {
        return sendError(res, 400, "All tags must be non-empty strings");
      }
      updates.tags = updates.tags.map((tag) => tag.trim());
    }

    // Prevent direct modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;

    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.contents) updates.contents = updates.contents.trim();
    if (updates.description) updates.description = updates.description.trim();
    if (updates.imageUrl) updates.imageUrl = updates.imageUrl.trim();

    // Update addon
    const updatedAddon = await Addon.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    ).populate("menuItemId", "name mealType isLive");

    return sendSuccess(res, 200, "Addon updated successfully", updatedAddon);
  } catch (error) {
    console.error("Error updating addon:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to update addon. Please try again");
  }
};

/**
 * Soft delete an addon
 * @access Admin only
 * @route DELETE /api/addons/:id
 * @param {string} req.params.id - Addon ID
 * @returns {Object} 200 - Success message
 */
export const deleteAddon = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Check if addon exists and is not already deleted
    const addon = await Addon.findOne({ _id: id, isDeleted: false });

    if (!addon) {
      return sendError(res, 404, "Addon not found or already deleted");
    }

    // Soft delete - mark as deleted
    addon.isDeleted = true;
    addon.deletedAt = new Date();
    addon.isLive = false; // Also mark as not live

    await addon.save();

    return sendSuccess(res, 200, "Addon deleted successfully", {
      id: addon._id,
      deletedAt: addon.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting addon:", error);
    return sendError(res, 500, "Failed to delete addon. Please try again");
  }
};

/**
 * Restore a soft-deleted addon
 * @access Admin only
 * @route POST /api/addons/:id/restore
 * @param {string} req.params.id - Addon ID
 * @returns {Object} 200 - Restored addon
 */
export const restoreAddon = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Check if addon exists and is deleted
    const addon = await Addon.findOne({ _id: id, isDeleted: true });

    if (!addon) {
      return sendError(res, 404, "Deleted addon not found");
    }

    // Check if the referenced menu item still exists and is not deleted
    const menuItem = await MenuItem.findOne({ _id: addon.menuItemId, isDeleted: false });
    if (!menuItem) {
      return sendError(
        res,
        400,
        "Cannot restore addon: the associated menu item no longer exists or has been deleted"
      );
    }

    // Restore addon
    addon.isDeleted = false;
    addon.deletedAt = null;

    await addon.save();
    await addon.populate("menuItemId", "name mealType isLive");

    return sendSuccess(res, 200, "Addon restored successfully", addon);
  } catch (error) {
    console.error("Error restoring addon:", error);
    return sendError(res, 500, "Failed to restore addon. Please try again");
  }
};

/**
 * Permanently delete an addon
 * @access Admin only
 * @route DELETE /api/addons/:id/permanent
 * @param {string} req.params.id - Addon ID
 * @returns {Object} 200 - Success message
 */
export const permanentlyDeleteAddon = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Check if addon exists
    const addon = await Addon.findById(id);

    if (!addon) {
      return sendError(res, 404, "Addon not found");
    }

    // Permanently delete from database
    await Addon.findByIdAndDelete(id);

    return sendSuccess(res, 200, "Addon permanently deleted", {
      id,
      name: addon.name,
    });
  } catch (error) {
    console.error("Error permanently deleting addon:", error);
    return sendError(res, 500, "Failed to permanently delete addon. Please try again");
  }
};

/**
 * Toggle addon live status
 * @access Admin only
 * @route PATCH /api/addons/:id/toggle-live
 * @param {string} req.params.id - Addon ID
 * @returns {Object} 200 - Updated addon
 */
export const toggleAddonLiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid addon ID format");
    }

    // Check if addon exists and is not deleted
    const addon = await Addon.findOne({ _id: id, isDeleted: false });

    if (!addon) {
      return sendError(res, 404, "Addon not found or has been deleted");
    }

    // Toggle isLive status
    addon.isLive = !addon.isLive;
    await addon.save();
    await addon.populate("menuItemId", "name mealType isLive");

    return sendSuccess(res, 200, `Addon ${addon.isLive ? "activated" : "deactivated"} successfully`, addon);
  } catch (error) {
    console.error("Error toggling addon live status:", error);
    return sendError(res, 500, "Failed to update addon status. Please try again");
  }
};

/**
 * Bulk update addons
 * @access Admin only
 * @route PATCH /api/addons/bulk-update
 * @body {Array} ids - Array of addon IDs
 * @body {Object} updates - Updates to apply to all items
 * @returns {Object} 200 - Bulk update result
 */
export const bulkUpdateAddons = async (req, res) => {
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
      return sendError(res, 400, "Invalid addon ID format", { invalidIds });
    }

    // Prevent modification of certain fields
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.isDeleted;
    delete updates.deletedAt;
    delete updates.menuItemId; // Don't allow bulk changing of menu item references

    // Validate category if provided
    if (updates.category) {
      const validCategories = [
        "BEVERAGE",
        "SWEETS",
        "CONDIMENT",
        "ICE_CREAM",
        "LAVA_CAKE",
        "DESSERT",
        "SNACK",
        "SIDE_DISH",
        "OTHER",
      ];
      if (!validCategories.includes(updates.category.toUpperCase())) {
        return sendError(res, 400, `Invalid category. Must be one of: ${validCategories.join(", ")}`);
      }
      updates.category = updates.category.toUpperCase();
    }

    // Validate price if provided
    if (updates.price !== undefined && (typeof updates.price !== "number" || updates.price < 0)) {
      return sendError(res, 400, "Price must be a non-negative number");
    }

    // Bulk update
    const result = await Addon.updateMany(
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
    console.error("Error bulk updating addons:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation error", { errors: messages });
    }

    return sendError(res, 500, "Failed to bulk update addons. Please try again");
  }
};

/**
 * Delete all addons for a specific menu item
 * @access Admin only
 * @route DELETE /api/addons/menu-item/:menuItemId
 * @param {string} req.params.menuItemId - Menu item ID
 * @returns {Object} 200 - Deletion result
 */
export const deleteAddonsByMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return sendError(res, 400, "Invalid menu item ID format");
    }

    // Soft delete all addons for this menu item
    const result = await Addon.updateMany(
      { menuItemId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), isLive: false } }
    );

    return sendSuccess(res, 200, "Addons deleted successfully", {
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting addons by menu item:", error);
    return sendError(res, 500, "Failed to delete addons. Please try again");
  }
};

/**
 * Get addon statistics
 * @access Admin only
 * @route GET /api/addons/stats
 * @returns {Object} 200 - Addon statistics
 */
export const getAddonStats = async (req, res) => {
  try {
    const stats = await Addon.aggregate([
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          liveCount: [{ $match: { isLive: true, isDeleted: false } }, { $count: "count" }],
          deletedCount: [{ $match: { isDeleted: true } }, { $count: "count" }],
          byCategory: [
            { $match: { isDeleted: false } },
            { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
          ],
          byMenuItem: [
            { $match: { isDeleted: false } },
            {
              $group: {
                _id: "$menuItemId",
                count: { $sum: 1 },
                avgPrice: { $avg: "$price" },
                totalPrice: { $sum: "$price" },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
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

    // Populate menu item details for top menu items
    if (stats[0].byMenuItem && stats[0].byMenuItem.length > 0) {
      const menuItemIds = stats[0].byMenuItem.map((item) => item._id);
      const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }, "name mealType").lean();

      const menuItemMap = menuItems.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});

      stats[0].byMenuItem = stats[0].byMenuItem.map((item) => ({
        ...item,
        menuItem: menuItemMap[item._id.toString()] || null,
      }));
    }

    const result = {
      total: stats[0].totalCount[0]?.count || 0,
      live: stats[0].liveCount[0]?.count || 0,
      deleted: stats[0].deletedCount[0]?.count || 0,
      byCategory: stats[0].byCategory,
      topMenuItems: stats[0].byMenuItem,
      priceStats: stats[0].priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
    };

    return sendSuccess(res, 200, "Addon statistics retrieved successfully", result);
  } catch (error) {
    console.error("Error fetching addon stats:", error);
    return sendError(res, 500, "Failed to retrieve statistics. Please try again");
  }
};
