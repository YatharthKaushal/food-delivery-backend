import Voucher from "../schema/Voucher.schema.js";
import Subscription from "../schema/Subscription.schema.js";
import Customer from "../schema/Customer.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";

/**
 * DEPRECATED: Generate vouchers for a subscription
 * @deprecated This function is no longer used. Voucher tracking is now done via the Subscription table's
 * totalVouchers and usedVouchers fields. Individual voucher records are NOT created.
 * @access System/Internal - Called when subscription is created
 * @description Creates individual voucher records for a subscription
 *
 * NOTE: This function has been deprecated as part of Phase 1 refactor (IMPLEMENTATION_PLAN.md)
 * The new approach tracks vouchers directly in the Subscription schema.
 * See: src/Subscription/subscription.controller.js for the new voucher management logic.
 */
/* COMMENTED OUT - NO LONGER IN USE
export const generateVouchersForSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    // Find subscription
    const subscription = await Subscription.findById(subscriptionId).populate(
      "planId"
    );

    if (!subscription) {
      return sendError(res, 404, "Subscription not found");
    }

    // Check if vouchers already exist for this subscription
    const existingVouchers = await Voucher.countDocuments({
      subscriptionId: subscription._id,
    });

    if (existingVouchers > 0) {
      return sendError(
        res,
        409,
        "Vouchers already exist for this subscription",
        {
          existingCount: existingVouchers,
        }
      );
    }

    // Determine meal type based on plan type
    let mealType = "BOTH";
    if (subscription.planId.planType === "LUNCH_ONLY") {
      mealType = "LUNCH";
    } else if (subscription.planId.planType === "DINNER_ONLY") {
      mealType = "DINNER";
    }

    // Create vouchers
    const vouchers = [];
    const voucherCount = subscription.totalVouchers;

    for (let i = 0; i < voucherCount; i++) {
      vouchers.push({
        subscriptionId: subscription._id,
        customerId: subscription.customerId,
        mealType,
        issuedDate: subscription.purchaseDate,
        expiryDate: subscription.expiryDate,
        isUsed: false,
        isExpired: false,
      });
    }

    // Bulk insert vouchers
    const createdVouchers = await Voucher.insertMany(vouchers);

    return sendSuccess(
      res,
      201,
      `${createdVouchers.length} vouchers generated successfully`,
      {
        voucherCount: createdVouchers.length,
        vouchers: createdVouchers,
      }
    );
  } catch (error) {
    console.error("Error generating vouchers:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(
      res,
      500,
      "Failed to generate vouchers. Please try again"
    );
  }
};
*/

/**
 * Get customer's own vouchers
 * @access Customer (Firebase authenticated)
 * @description Retrieve all voucher batches for the authenticated customer
 */
export const getMyVouchers = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const {
      mealType,
      hasRemaining,
      isExpired,
      includeDeleted = "false",
      sortBy = "issuedDate",
      sortOrder = "desc",
    } = req.query;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Build filter
    const filter = { customerId: customer._id };

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (hasRemaining === "true") {
      filter.remainingVouchers = { $gt: 0 };
    } else if (hasRemaining === "false") {
      filter.remainingVouchers = 0;
    }

    if (isExpired !== undefined) {
      filter.isExpired = isExpired === "true";
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch voucher batches
    const vouchers = await Voucher.find(filter)
      .populate("subscriptionId")
      .sort(sortOptions);

    // Add computed fields
    const vouchersWithDetails = vouchers.map((v) => ({
      ...v.toObject(),
      usedVouchers: v.totalVouchers - v.remainingVouchers,
      isExhausted: v.remainingVouchers === 0,
    }));

    return sendSuccess(
      res,
      200,
      "Vouchers retrieved successfully",
      vouchersWithDetails
    );
  } catch (error) {
    console.error("Error fetching customer vouchers:", error);
    return sendError(res, 500, "Failed to fetch vouchers. Please try again");
  }
};

/**
 * Get customer's available vouchers
 * @access Customer (Firebase authenticated)
 * @description Get voucher batches with remaining vouchers that are not expired
 */
export const getMyAvailableVouchers = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const { mealType } = req.query;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Build filter for available voucher batches
    const filter = {
      customerId: customer._id,
      remainingVouchers: { $gt: 0 },
      isExpired: false,
      isDeleted: false,
      expiryDate: { $gt: new Date() },
    };

    if (mealType) {
      const upperMealType = mealType.toUpperCase();
      // Match specific meal type or BOTH
      filter.$or = [{ mealType: upperMealType }, { mealType: "BOTH" }];
    }

    // Fetch available voucher batches
    const vouchers = await Voucher.find(filter)
      .populate("subscriptionId")
      .sort({ expiryDate: 1 }); // Sort by expiry date (closest first)

    // Add computed fields
    const vouchersWithDetails = vouchers.map((v) => ({
      ...v.toObject(),
      usedVouchers: v.totalVouchers - v.remainingVouchers,
    }));

    return sendSuccess(
      res,
      200,
      "Available vouchers retrieved successfully",
      vouchersWithDetails
    );
  } catch (error) {
    console.error("Error fetching available vouchers:", error);
    return sendError(
      res,
      500,
      "Failed to fetch available vouchers. Please try again"
    );
  }
};

/**
 * Get voucher batch by ID (Customer's own voucher)
 * @access Customer (Firebase authenticated)
 */
export const getMyVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const firebaseUid = req.firebaseUser?.uid;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find voucher batch
    const voucher = await Voucher.findOne({
      _id: id,
      customerId: customer._id,
    }).populate("subscriptionId");

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Add computed fields
    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      "Voucher retrieved successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error fetching voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to fetch voucher. Please try again");
  }
};

/**
 * Use/Redeem vouchers from a voucher batch
 * @access Customer (Firebase authenticated) or System
 * @description Decrements remainingVouchers count when vouchers are used
 * @param {string} voucherId - The voucher batch ID
 * @param {number} voucherCount - Number of vouchers to consume (default: 1)
 */
export const useVoucher = async (req, res) => {
  try {
    const { voucherId, voucherCount = 1 } = req.body;
    const firebaseUid = req.firebaseUser?.uid;

    if (!voucherId) {
      return sendError(res, 400, "Voucher ID is required");
    }

    if (!Number.isInteger(voucherCount) || voucherCount < 1) {
      return sendError(res, 400, "Voucher count must be a positive integer");
    }

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Find voucher batch
    const voucher = await Voucher.findOne({
      _id: voucherId,
      customerId: customer._id,
      isDeleted: false,
    });

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Check if expired
    if (voucher.isExpired || new Date() > voucher.expiryDate) {
      voucher.isExpired = true;
      await voucher.save();
      return sendError(res, 400, "Voucher has expired");
    }

    // Check if enough vouchers are available
    if (voucher.remainingVouchers < voucherCount) {
      return sendError(res, 400, "Not enough vouchers remaining", {
        remainingVouchers: voucher.remainingVouchers,
        requested: voucherCount,
      });
    }

    // Decrement voucher count
    voucher.remainingVouchers -= voucherCount;

    await voucher.save();
    await voucher.populate("subscriptionId");

    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      vouchersConsumedNow: voucherCount,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      `${voucherCount} voucher(s) redeemed successfully`,
      voucherDetails
    );
  } catch (error) {
    console.error("Error using voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(res, 500, "Failed to use voucher. Please try again");
  }
};

/**
 * Get voucher count summary
 * @access Customer (Firebase authenticated)
 * @description Get aggregate counts of vouchers by status
 */
export const getMyVoucherSummary = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    // Find customer
    const customer = await Customer.findOne({ firebaseUid, isDeleted: false });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    // Get voucher batch counts
    const totalBatches = await Voucher.countDocuments({
      customerId: customer._id,
      isDeleted: false,
    });

    const expiredBatches = await Voucher.countDocuments({
      customerId: customer._id,
      isExpired: true,
      isDeleted: false,
    });

    // Aggregate total voucher counts
    const voucherTotals = await Voucher.aggregate([
      {
        $match: {
          customerId: customer._id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalVouchers: { $sum: "$totalVouchers" },
          remainingVouchers: { $sum: "$remainingVouchers" },
        },
      },
    ]);

    // Aggregate available vouchers by meal type
    const vouchersByMealType = await Voucher.aggregate([
      {
        $match: {
          customerId: customer._id,
          isDeleted: false,
          isExpired: false,
          remainingVouchers: { $gt: 0 },
          expiryDate: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: "$mealType",
          count: { $sum: "$remainingVouchers" },
        },
      },
    ]);

    // Format meal type counts
    const mealTypeCounts = {
      LUNCH: 0,
      DINNER: 0,
      BOTH: 0,
    };

    vouchersByMealType.forEach((item) => {
      mealTypeCounts[item._id] = item.count;
    });

    const totals = voucherTotals[0] || {
      totalVouchers: 0,
      remainingVouchers: 0,
    };
    const usedVouchers = totals.totalVouchers - totals.remainingVouchers;

    return sendSuccess(res, 200, "Voucher summary retrieved successfully", {
      totalBatches,
      expiredBatches,
      totalVouchersIssued: totals.totalVouchers,
      availableVouchers: totals.remainingVouchers,
      usedVouchers,
      availableByMealType: mealTypeCounts,
    });
  } catch (error) {
    console.error("Error fetching voucher summary:", error);
    return sendError(
      res,
      500,
      "Failed to fetch voucher summary. Please try again"
    );
  }
};

/**
 * Get all vouchers (Admin)
 * @access Admin only
 * @description Get all voucher batches with filtering and pagination
 */
export const getAllVouchers = async (req, res) => {
  try {
    const {
      customerId,
      subscriptionId,
      mealType,
      hasRemaining,
      isExpired,
      includeDeleted = "false",
      sortBy = "issuedDate",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {};

    if (customerId) {
      filter.customerId = customerId;
    }

    if (subscriptionId) {
      filter.subscriptionId = subscriptionId;
    }

    if (mealType) {
      filter.mealType = mealType.toUpperCase();
    }

    if (hasRemaining === "true") {
      filter.remainingVouchers = { $gt: 0 };
    } else if (hasRemaining === "false") {
      filter.remainingVouchers = 0;
    }

    if (isExpired !== undefined) {
      filter.isExpired = isExpired === "true";
    }

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [vouchers, totalCount] = await Promise.all([
      Voucher.find(filter)
        .populate("subscriptionId customerId")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Voucher.countDocuments(filter),
    ]);

    // Add computed fields
    const vouchersWithDetails = vouchers.map((v) => ({
      ...v.toObject(),
      usedVouchers: v.totalVouchers - v.remainingVouchers,
      isExhausted: v.remainingVouchers === 0,
    }));

    return sendSuccess(res, 200, "Vouchers retrieved successfully", {
      vouchers: vouchersWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return sendError(res, 500, "Failed to fetch vouchers. Please try again");
  }
};

/**
 * Get voucher batch by ID (Admin)
 * @access Admin only
 */
export const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id).populate(
      "subscriptionId customerId"
    );

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Add computed fields
    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      "Voucher retrieved successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error fetching voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to fetch voucher. Please try again");
  }
};

/**
 * Update voucher batch (Admin)
 * @access Admin only
 * @description Allows admin to manually update voucher batch (for corrections)
 */
export const updateVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { remainingVouchers, isExpired } = req.body;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Update fields if provided
    if (remainingVouchers !== undefined) {
      if (!Number.isInteger(remainingVouchers) || remainingVouchers < 0) {
        return sendError(
          res,
          400,
          "Remaining vouchers must be a non-negative integer"
        );
      }

      if (remainingVouchers > voucher.totalVouchers) {
        return sendError(
          res,
          400,
          "Remaining vouchers cannot exceed total vouchers"
        );
      }

      voucher.remainingVouchers = remainingVouchers;
    }

    if (isExpired !== undefined) {
      voucher.isExpired = isExpired;
    }

    await voucher.save();
    await voucher.populate("subscriptionId customerId");

    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      "Voucher updated successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error updating voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid ID format");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, "Validation failed", { errors });
    }

    return sendError(res, 500, "Failed to update voucher. Please try again");
  }
};

/**
 * Delete voucher batch (Soft delete) (Admin)
 * @access Admin only
 */
export const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    // Soft delete
    voucher.isDeleted = true;
    voucher.deletedAt = new Date();
    await voucher.save();

    await voucher.populate("subscriptionId customerId");

    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      "Voucher deleted successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error deleting voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to delete voucher. Please try again");
  }
};

/**
 * Restore deleted voucher batch (Admin)
 * @access Admin only
 */
export const restoreVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 400, "Voucher ID is required");
    }

    const voucher = await Voucher.findById(id);

    if (!voucher) {
      return sendError(res, 404, "Voucher not found");
    }

    if (!voucher.isDeleted) {
      return sendError(res, 400, "Voucher is not deleted");
    }

    // Restore
    voucher.isDeleted = false;
    voucher.deletedAt = null;
    await voucher.save();

    await voucher.populate("subscriptionId customerId");

    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers: voucher.totalVouchers - voucher.remainingVouchers,
      isExhausted: voucher.remainingVouchers === 0,
    };

    return sendSuccess(
      res,
      200,
      "Voucher restored successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error restoring voucher:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid voucher ID format");
    }

    return sendError(res, 500, "Failed to restore voucher. Please try again");
  }
};

/**
 * Update expired vouchers (System/Cron job)
 * @access Admin only
 * @description Marks all vouchers past expiry date as expired
 */
export const updateExpiredVouchers = async (_req, res) => {
  try {
    const result = await Voucher.updateMany(
      {
        isExpired: false,
        isDeleted: false,
        expiryDate: { $lte: new Date() },
      },
      {
        $set: { isExpired: true },
      }
    );

    return sendSuccess(res, 200, "Expired vouchers updated successfully", {
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating expired vouchers:", error);
    return sendError(
      res,
      500,
      "Failed to update expired vouchers. Please try again"
    );
  }
};

/**
 * Get voucher statistics (Admin)
 * @access Admin only
 * @description Get analytics and statistics about voucher batches
 */
export const getVoucherStats = async (_req, res) => {
  try {
    const totalBatches = await Voucher.countDocuments({ isDeleted: false });
    const expiredBatches = await Voucher.countDocuments({
      isExpired: true,
      isDeleted: false,
    });

    // Aggregate total voucher counts
    const voucherTotals = await Voucher.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalVouchersIssued: { $sum: "$totalVouchers" },
          totalRemainingVouchers: { $sum: "$remainingVouchers" },
        },
      },
    ]);

    // Aggregate vouchers by meal type
    const vouchersByMealType = await Voucher.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$mealType",
          totalIssued: { $sum: "$totalVouchers" },
          remaining: { $sum: "$remainingVouchers" },
          batches: { $sum: 1 },
        },
      },
    ]);

    // Get vouchers with remaining count
    const batchesWithRemaining = await Voucher.countDocuments({
      isDeleted: false,
      remainingVouchers: { $gt: 0 },
      isExpired: false,
      expiryDate: { $gt: new Date() },
    });

    const totals = voucherTotals[0] || {
      totalVouchersIssued: 0,
      totalRemainingVouchers: 0,
    };
    const usedVouchers =
      totals.totalVouchersIssued - totals.totalRemainingVouchers;
    const usageRate =
      totals.totalVouchersIssued > 0
        ? ((usedVouchers / totals.totalVouchersIssued) * 100).toFixed(2)
        : 0;

    return sendSuccess(res, 200, "Voucher statistics retrieved successfully", {
      totalBatches,
      expiredBatches,
      batchesWithRemaining,
      totalVouchersIssued: totals.totalVouchersIssued,
      availableVouchers: totals.totalRemainingVouchers,
      usedVouchers,
      usageRate: `${usageRate}%`,
      vouchersByMealType,
    });
  } catch (error) {
    console.error("Error fetching voucher statistics:", error);
    return sendError(
      res,
      500,
      "Failed to fetch voucher statistics. Please try again"
    );
  }
};

/**
 * Get voucher batch by subscription (Admin)
 * @access Admin only
 * @description Get the voucher batch for a specific subscription
 */
export const getVouchersBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    // Since there's only ONE voucher batch per subscription now
    const voucher = await Voucher.findOne({
      subscriptionId,
      isDeleted: false,
    })
      .populate("customerId subscriptionId")
      .sort({ issuedDate: 1 });

    if (!voucher) {
      return sendError(
        res,
        404,
        "Voucher batch not found for this subscription"
      );
    }

    const usedVouchers = voucher.totalVouchers - voucher.remainingVouchers;
    const isAvailable =
      voucher.remainingVouchers > 0 &&
      !voucher.isExpired &&
      new Date() <= voucher.expiryDate;

    const voucherDetails = {
      ...voucher.toObject(),
      usedVouchers,
      isExhausted: voucher.remainingVouchers === 0,
      isAvailable,
    };

    return sendSuccess(
      res,
      200,
      "Voucher batch retrieved successfully",
      voucherDetails
    );
  } catch (error) {
    console.error("Error fetching voucher by subscription:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(res, 500, "Failed to fetch voucher. Please try again");
  }
};

/**
 * Delete voucher batch by subscription (Admin)
 * @access Admin only
 * @description Soft delete the voucher batch for a subscription
 */
export const bulkDeleteVouchersBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return sendError(res, 400, "Subscription ID is required");
    }

    // Since there's only ONE voucher batch per subscription
    const result = await Voucher.updateOne(
      {
        subscriptionId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return sendError(res, 404, "Voucher batch not found or already deleted");
    }

    return sendSuccess(res, 200, "Voucher batch deleted successfully", {
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting voucher batch:", error);

    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid subscription ID format");
    }

    return sendError(
      res,
      500,
      "Failed to delete voucher batch. Please try again"
    );
  }
};
